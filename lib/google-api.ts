import { Buffer } from "buffer";
import { supabaseServer } from "./supabase-server";
import { v4 as uuidv4 } from "uuid";

const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GOOGLE_MODEL_TEXT = process.env.GOOGLE_AI_MODEL_TEXT || "gemini-2.5-pro";
const GOOGLE_MODEL_IMAGE = process.env.GOOGLE_AI_MODEL_IMAGE || "gemini-2.5-flash-image";
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "generations";

function isOAuthToken(key?: string | null) {
  return typeof key === "string" && key.startsWith("ya29.");
}

function buildGoogleHeaders(useOAuth: boolean) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (useOAuth && GOOGLE_API_KEY) {
    headers["Authorization"] = `Bearer ${GOOGLE_API_KEY}`;
  } else if (GOOGLE_API_KEY) {
    headers["x-goog-api-key"] = GOOGLE_API_KEY;
  }
  return headers;
}

// single delay helper (avoid duplicate 'sleep' names)
async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// fetchWithRetries with AbortController timeout support
export async function fetchWithRetries(
  url: string,
  options: RequestInit = {},
  attempts = 3,
  baseDelay = 300,
  timeoutMs = 30000 // default per-attempt timeout
): Promise<Response> {
  let lastErr: any = null;

  for (let i = 1; i <= attempts; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const callerSignal = options.signal;
    const onCallerAbort = () => controller.abort();

    if (callerSignal) {
      if ((callerSignal as AbortSignal).aborted) {
        clearTimeout(timeout);
        throw new DOMException("The operation was aborted.", "AbortError");
      }
      (callerSignal as AbortSignal).addEventListener("abort", onCallerAbort, { once: true });
    }

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (res.ok) {
        return res;
      }

      // Retryable HTTP statuses
      if ([429, 500, 502, 503, 504].includes(res.status)) {
        const ra = res.headers.get("retry-after");
        const msg = await res.text().catch(() => "");
        if (ra && !Number.isNaN(Number(ra))) {
          const waitMs = Number(ra) * 1000;
          console.warn(
            `[google-api] transient status ${res.status}, waiting ${waitMs}ms (retry ${i}/${attempts})`
          );
          await delay(waitMs);
        } else {
          const backoff = Math.pow(2, i - 1) * baseDelay + Math.floor(Math.random() * 200);
          console.warn(
            `[google-api] transient status ${res.status}, backing off ${backoff}ms (retry ${i}/${attempts})`
          );
          await delay(backoff);
        }
        lastErr = new Error(`Transient status ${res.status}: ${msg}`);
        continue;
      }

      // Specific 404 handling
      if (res.status === 404) {
        const txt = await res.text().catch(() => "");
        console.error("[google-api] 404 error - check endpoint URL and model name", {
          url,
          status: res.status,
          body: txt?.slice?.(0, 500),
        });
        throw new Error(`API Endpoint not found (404). Model or endpoint may be incorrect.`);
      }

      const txt = await res.text().catch(() => "");
      throw new Error(`Non-retryable HTTP ${res.status}: ${txt}`);
    } catch (err: any) {
      if (err && err.name === "AbortError") {
        lastErr = new Error(`Request aborted (attempt ${i}/${attempts})`);
      } else {
        lastErr = err;
      }

      if (i === attempts) {
        break;
      }

      const backoff = Math.pow(2, i - 1) * baseDelay + Math.floor(Math.random() * 200);
      console.warn(
        `[google-api] fetch error, retrying in ${backoff}ms (attempt ${i}/${attempts})`,
        err?.message ?? err
      );
      await delay(backoff);
    } finally {
      clearTimeout(timeout);
      if (callerSignal) {
        (callerSignal as AbortSignal).removeEventListener("abort", onCallerAbort);
      }
    }
  }

  throw lastErr ?? new Error("fetchWithRetries exhausted");
}

// Utilities to extract text from Gemini responses (keeps your original robust extractor)
function extractTextFromGeminiResponse(json: any): string | null {
  const cand = json?.candidates?.[0];
  if (cand) {
    const c = cand.content;
    if (c) {
      if (Array.isArray(c.parts) && c.parts.length > 0) {
        const joined = c.parts.map((p: any) => (typeof p.text === "string" ? p.text : "")).join(" ").trim();
        if (joined) return joined;
      }
      if (c?.content && Array.isArray(c.content) && typeof c.content[0]?.text === "string") {
        return c.content[0].text.trim();
      }
      if (Array.isArray(c) && typeof c[0]?.text === "string") return c[0].text.trim();
      if (typeof c === "string" && c.trim().length > 0) return c.trim();
    }
    if (Array.isArray(cand?.content) && typeof cand.content[0]?.text === "string")
      return cand.content[0].text.trim();
    if (cand?.content?.content && Array.isArray(cand.content.content)) {
      const p = cand.content.content[0];
      if (p?.parts && Array.isArray(p.parts)) {
        const joined = p.parts.map((pr: any) => (typeof pr.text === "string" ? pr.text : "")).join(" ").trim();
        if (joined) return joined;
      }
    }
  }

  if (Array.isArray(json?.output) && typeof json.output[0]?.content?.[0]?.text === "string") {
    return json.output[0].content[0].text.trim();
  }

  const msgContent = json?.output?.[0]?.message?.content;
  if (msgContent) {
    if (typeof msgContent === "string" && msgContent.trim().length > 0) return msgContent.trim();
    if (Array.isArray(msgContent) && typeof msgContent[0]?.text === "string") return msgContent[0].text.trim();
  }

  if (typeof json?.text === "string" && json.text.trim().length > 0) return json.text.trim();
  if (typeof json?.response === "string" && json.response.trim().length > 0) return json.response.trim();

  return null;
}

export async function enhancePromptWithGemini(originalPrompt: string, stylePreset?: string) {
  if (!GOOGLE_API_KEY) throw new Error("GOOGLE_AI_API_KEY not configured");
  if (!originalPrompt || originalPrompt.trim().length === 0) {
    throw new Error("original prompt required");
  }

  const systemInstruction = `You are an expert prompt engineer for AI image generation. Transform the user's brief into a detailed, vivid prompt for a commercial beauty product advertisement. Include: subject details, composition, camera technique, lighting setup, color palette, textures, mood, and professional photography keywords. Return ONLY the enhanced prompt as a single paragraph.`;

  const model = GOOGLE_MODEL_TEXT;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${GOOGLE_API_KEY}`;
  const useOAuth = isOAuthToken(GOOGLE_API_KEY);
  const headers = buildGoogleHeaders(useOAuth);

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              `${systemInstruction}\n\n` +
              `User prompt: ${originalPrompt}` +
              `${stylePreset ? `\nStyle: ${stylePreset}` : ""}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  };

  const res = await fetchWithRetries(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("[Gemini text] Request failed", { status: res.status, responseSnippet: txt?.slice?.(0, 2000) });
    throw new Error(`Gemini enhancement failed: ${res.status} ${txt}`);
  }

  const json = await res.json();
  const candidateText = extractTextFromGeminiResponse(json);

  if (!candidateText) {
    console.error("[Gemini text] Unexpected response", { raw: JSON.stringify(json).slice(0, 2000) });
    throw new Error(`Unexpected Gemini response`);
  }

  const enhanced = candidateText.replace(/\s{2,}/g, " ").trim();
  if (enhanced.length < 10) throw new Error("Gemini returned unusually short prompt");
  return enhanced;
}

// Generate image with Gemini using :generateContent and defensive parsing
export async function generateImageWithGemini({
  prompt,
  userId,
  width = 1024,
  height = 1024,
  numVariations = 1,
  stylePreset,
}: {
  prompt: string;
  userId?: string;
  width?: number;
  height?: number;
  numVariations?: number;
  stylePreset?: string | null;
}): Promise<string[]> {
  if (!GOOGLE_API_KEY) throw new Error("GOOGLE_AI_API_KEY not configured");
  if (!prompt || prompt.trim().length === 0) throw new Error("prompt required");

  const model = GOOGLE_MODEL_IMAGE;
  const bucket = SUPABASE_BUCKET;
  const results: string[] = [];
  const iterations = Math.max(1, Math.min(1, numVariations));

  // NOTE: use :generateContent for Gemini REST; earlier :generateImage causes 404 for many projects
  const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${GOOGLE_API_KEY}`;
  const useOAuth = isOAuthToken(GOOGLE_API_KEY);
  const headers = buildGoogleHeaders(useOAuth);

  for (let i = 0; i < iterations; i++) {
    let finalPrompt = prompt;
    if (stylePreset) finalPrompt = `${finalPrompt}, style: ${stylePreset}`;

    // put size and instructions in the prompt; some models accept explicit image config, but this is robust
    const imageRequestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Generate a single image (${width}x${height}) from this prompt. Return the image inline as base64 (or a direct URL). Prompt: ${finalPrompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        // keep token budget reasonable for image results
        maxOutputTokens: 1024,
      },
    };

    try {
      const r = await fetchWithRetries(
        baseUrl,
        {
          method: "POST",
          headers,
          body: JSON.stringify(imageRequestBody),
        },
        3,
        400
      );

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.error("[Gemini image] Request failed", { status: r.status, responseSnippet: txt?.slice?.(0, 2000) });
        throw new Error(`Image generation failed: ${r.status} ${txt}`);
      }

      const j = await r.json().catch(() => ({}));

      // try multiple possible shapes for image data
      // 1) candidates[0].content.parts[*].inlineData + mimeType
      // 2) candidates[0].content.parts[*].text if it contains data:url
      // 3) output[0].url or image.url
      let base64: string | null = null;
      let mimeType: string | null = null;
      const candidates = j?.candidates ?? [];

      if (Array.isArray(candidates) && candidates.length > 0) {
        const parts = candidates[0]?.content?.parts ?? [];
        if (Array.isArray(parts) && parts.length > 0) {
          for (const p of parts) {
            if (p?.inlineData && p?.mimeType) {
              base64 = p.inlineData;
              mimeType = p.mimeType;
              break;
            }
            if (typeof p?.text === "string") {
              // look for data URL in text
              const m = p.text.match(/data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/);
              if (m) {
                mimeType = m[1];
                base64 = m[2];
                break;
              }
              // sometimes the base64 blob is returned directly as text
              const maybeB64 = p.text.trim();
              if (/^[A-Za-z0-9+/=]{100,}$/.test(maybeB64)) {
                base64 = maybeB64;
                mimeType = "image/png";
                break;
              }
            }
          }
        }
      }

      // fallback shapes
      if (!base64) {
        base64 = j?.image?.b64_json || j?.output?.[0]?.b64_json || j?.output?.[0]?.image?.b64 || j?.b64 || null;
      }

      // if still no base64, check for direct URL
      if (!base64) {
        const maybeUrl = j?.output?.[0]?.url || j?.image?.url || j?.url || null;
        if (maybeUrl && typeof maybeUrl === "string" && maybeUrl.startsWith("http")) {
          const imgResp = await fetch(maybeUrl);
          if (!imgResp.ok) {
            const txt = await imgResp.text().catch(() => "binary-fetch-failed");
            throw new Error(`Failed to fetch image from Google URL: ${imgResp.status} ${txt}`);
          }
          const buffer = Buffer.from(await imgResp.arrayBuffer());
          const filename = `generations/${userId || "anon"}/${Date.now()}-${uuidv4()}.png`;

          const { error: uploadError } = await supabaseServer.storage.from(bucket).upload(filename, buffer, {
            contentType: "image/png",
            upsert: false,
          });
          if (uploadError) throw new Error(`Supabase upload failed: ${uploadError.message}`);

          const { data } = supabaseServer.storage.from(bucket).getPublicUrl(filename);
          const publicUrl = data?.publicUrl ?? null;
          if (!publicUrl) throw new Error("Failed to get public URL");
          results.push(publicUrl);
          continue;
        }
      }

      if (!base64) {
        console.error("[Gemini image] No image data found in response:", JSON.stringify(j).slice(0, 2000));
        throw new Error(`No image data in Google response`);
      }

      // convert base64 to buffer and upload
      const buffer = Buffer.from(base64, "base64");
      const filename = `generations/${userId || "anon"}/${Date.now()}-${uuidv4()}.png`;

      const { error: uploadError } = await supabaseServer.storage.from(bucket).upload(filename, buffer, {
        contentType: mimeType ?? "image/png",
        upsert: false,
      });

      if (uploadError) {
        throw new Error(`Supabase upload failed: ${uploadError.message}`);
      }

      const { data } = supabaseServer.storage.from(bucket).getPublicUrl(filename);
      const publicUrl = data?.publicUrl ?? null;
      if (!publicUrl) throw new Error("Failed to get public URL");
      results.push(publicUrl);
    } catch (error) {
      console.error(`[Gemini image] Iteration ${i + 1} failed:`, error);
      throw error;
    }
  }

  return results;
}

// import { Buffer } from "buffer"
// import { supabaseServer } from "./supabase-server"
// import { v4 as uuidv4 } from "uuid"

// const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY
// const GOOGLE_MODEL_TEXT = process.env.GOOGLE_AI_MODEL_TEXT || "gemini-2.5-pro"
// const GOOGLE_MODEL_IMAGE = process.env.GOOGLE_AI_MODEL_IMAGE || "gemini-2.5-flash-image"
// const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "generations"
// function isOAuthToken(key?: string | null) {
//   return typeof key === "string" && key.startsWith("ya29.")
// }

// function buildGoogleHeaders(useOAuth: boolean) {
//   const headers: Record<string, string> = {
//     "Content-Type": "application/json",
//   }
//   if (useOAuth) {
//     headers["Authorization"] = `Bearer ${GOOGLE_API_KEY}`
//   } else if (GOOGLE_API_KEY) {
//     headers["x-goog-api-key"] = GOOGLE_API_KEY
//   }
//   return headers
// }

// function sleep(ms: number) {
//   return new Promise((res) => setTimeout(res, ms))
// }

// // lib/google-api.ts
// async function delay(ms: number) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// export async function fetchWithRetries(
//   url: string,
//   options: RequestInit = {},
//   attempts = 3,
//   baseDelay = 300,
//   timeoutMs = 30000 // default timeout per attempt
// ): Promise<Response> {
//   let lastErr: any = null;

//   for (let i = 1; i <= attempts; i++) {
//     // create an AbortController for this attempt's timeout
//     const controller = new AbortController();
//     const timeout = setTimeout(() => controller.abort(), timeoutMs);

//     // If the caller passed a signal, wire it so that if the caller aborts,
//     // we abort this controller as well.
//     const callerSignal = options.signal;
//     const onCallerAbort = () => controller.abort();

//     if (callerSignal) {
//       // If already aborted, short-circuit
//       if ((callerSignal as AbortSignal).aborted) {
//         clearTimeout(timeout);
//         throw new DOMException("The operation was aborted.", "AbortError");
//       }
//       (callerSignal as AbortSignal).addEventListener("abort", onCallerAbort, { once: true });
//     }

//     try {
//       const res = await fetch(url, {
//         ...options,
//         // pass our controller signal — it will be aborted either by timeout or caller signal
//         signal: controller.signal,
//       });

//       if (res.ok) {
//         return res;
//       }

//       // Handle retryable HTTP statuses
//       if ([429, 500, 502, 503, 504].includes(res.status)) {
//         const ra = res.headers.get("retry-after");
//         const msg = await res.text().catch(() => "");
//         if (ra && !Number.isNaN(Number(ra))) {
//           const waitMs = Number(ra) * 1000;
//           console.warn(
//             `[google-api] transient status ${res.status}, waiting ${waitMs}ms (retry ${i}/${attempts})`
//           );
//           await sleep(waitMs);
//         } else {
//           const delay = Math.pow(2, i - 1) * baseDelay + Math.floor(Math.random() * 200);
//           console.warn(
//             `[google-api] transient status ${res.status}, backing off ${delay}ms (retry ${i}/${attempts})`
//           );
//           await sleep(delay);
//         }
//         lastErr = new Error(`Transient status ${res.status}: ${msg}`);
//         continue;
//       }

//       // Specific 404 handling
//       if (res.status === 404) {
//         const txt = await res.text().catch(() => "");
//         console.error("[google-api] 404 error - check endpoint URL and model name", {
//           url,
//           status: res.status,
//           body: txt?.slice?.(0, 500),
//         });
//         throw new Error(`API Endpoint not found (404). Model or endpoint may be incorrect.`);
//       }

//       const txt = await res.text().catch(() => "");
//       throw new Error(`Non-retryable HTTP ${res.status}: ${txt}`);
//     } catch (err: any) {
//       // Distinguish AbortError (timeout or caller abort) from other errors if desired
//       if (err && err.name === "AbortError") {
//         // This attempt timed out or was aborted by caller
//         lastErr = new Error(`Request aborted (attempt ${i}/${attempts})`);
//       } else {
//         lastErr = err;
//       }

//       // If last attempt, break and throw below
//       if (i === attempts) {
//         break;
//       }

//       const delay = Math.pow(2, i - 1) * baseDelay + Math.floor(Math.random() * 200);
//       console.warn(
//         `[google-api] fetch error, retrying in ${delay}ms (attempt ${i}/${attempts})`,
//         err?.message ?? err
//       );
//       await sleep(delay);
//     } finally {
//       // cleanup
//       clearTimeout(timeout);
//       if (callerSignal) {
//         (callerSignal as AbortSignal).removeEventListener("abort", onCallerAbort);
//       }
//     }
//   }

//   throw lastErr ?? new Error("fetchWithRetries exhausted");
// }

// // async function fetchWithRetries(
// //   url: string,
// //   options: RequestInit,
// //   attempts = 3,
// //   baseDelay = 300
// // ) {
// //   let lastErr: any = null
// //   for (let i = 1; i <= attempts; i++) {
// //     try {
// //       const res = await fetch(url, {
// //         ...options,
// //         timeout: 30000,
// //       })
// //       if (res.ok) return res

// //       if ([429, 500, 502, 503, 504].includes(res.status)) {
// //         const ra = res.headers.get("retry-after")
// //         const msg = await res.text().catch(() => "")
// //         if (ra && !Number.isNaN(Number(ra))) {
// //           const waitMs = Number(ra) * 1000
// //           console.warn(
// //             `[google-api] transient status ${res.status}, waiting ${waitMs}ms (retry ${i}/${attempts})`
// //           )
// //           await sleep(waitMs)
// //         } else {
// //           const delay = Math.pow(2, i - 1) * baseDelay + Math.floor(Math.random() * 200)
// //           console.warn(
// //             `[google-api] transient status ${res.status}, backing off ${delay}ms (retry ${i}/${attempts})`
// //           )
// //           await sleep(delay)
// //         }
// //         lastErr = new Error(`Transient status ${res.status}: ${msg}`)
// //         continue
// //       }

// //       if (res.status === 404) {
// //         const txt = await res.text().catch(() => "")
// //         console.error("[google-api] 404 error - check endpoint URL and model name", {
// //           url,
// //           status: res.status,
// //           body: txt?.slice?.(0, 500)
// //         })
// //         throw new Error(`API Endpoint not found (404). Model or endpoint may be incorrect.`)
// //       }

// //       const txt = await res.text().catch(() => "")
// //       throw new Error(`Non-retryable HTTP ${res.status}: ${txt}`)
// //     } catch (err: any) {
// //       lastErr = err
// //       if (i === attempts) break
// //       const delay = Math.pow(2, i - 1) * baseDelay + Math.floor(Math.random() * 200)
// //       console.warn(
// //         `[google-api] fetch error, retrying in ${delay}ms (attempt ${i}/${attempts})`,
// //         err?.message ?? err
// //       )
// //       await sleep(delay)
// //     }
// //   }
// //   throw lastErr ?? new Error("fetchWithRetries exhausted")
// // }

// function extractTextFromGeminiResponse(json: any): string | null {
//   const cand = json?.candidates?.[0]
//   if (cand) {
//     const c = cand.content
//     if (c) {
//       if (Array.isArray(c.parts) && c.parts.length > 0) {
//         const joined = c.parts.map((p: any) => (typeof p.text === "string" ? p.text : "")).join(" ").trim()
//         if (joined) return joined
//       }
//       if (c?.content && Array.isArray(c.content) && typeof c.content[0]?.text === "string") {
//         return c.content[0].text.trim()
//       }
//       if (Array.isArray(c) && typeof c[0]?.text === "string") return c[0].text.trim()
//       if (typeof c === "string" && c.trim().length > 0) return c.trim()
//     }
//     if (Array.isArray(cand?.content) && typeof cand.content[0]?.text === "string")
//       return cand.content[0].text.trim()
//     if (cand?.content?.content && Array.isArray(cand.content.content)) {
//       const p = cand.content.content[0]
//       if (p?.parts && Array.isArray(p.parts)) {
//         const joined = p.parts.map((pr: any) => (typeof pr.text === "string" ? pr.text : "")).join(" ").trim()
//         if (joined) return joined
//       }
//     }
//   }

//   if (Array.isArray(json?.output) && typeof json.output[0]?.content?.[0]?.text === "string") {
//     return json.output[0].content[0].text.trim()
//   }

//   const msgContent = json?.output?.[0]?.message?.content
//   if (msgContent) {
//     if (typeof msgContent === "string" && msgContent.trim().length > 0) return msgContent.trim()
//     if (Array.isArray(msgContent) && typeof msgContent[0]?.text === "string") return msgContent[0].text.trim()
//   }

//   if (typeof json?.text === "string" && json.text.trim().length > 0) return json.text.trim()
//   if (typeof json?.response === "string" && json.response.trim().length > 0) return json.response.trim()

//   return null
// }

// export async function enhancePromptWithGemini(originalPrompt: string, stylePreset?: string) {
//   if (!GOOGLE_API_KEY) throw new Error("GOOGLE_AI_API_KEY not configured")
//   if (!originalPrompt || originalPrompt.trim().length === 0) {
//     throw new Error("original prompt required")
//   }

//   const systemInstruction = `You are an expert prompt engineer for AI image generation. Transform the user's brief into a detailed, vivid prompt for a commercial beauty product advertisement. Include: subject details, composition, camera technique, lighting setup, color palette, textures, mood, and professional photography keywords. Return ONLY the enhanced prompt as a single paragraph.`

//   const model = GOOGLE_MODEL_TEXT
//   const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${GOOGLE_API_KEY}`
//   const useOAuth = isOAuthToken(GOOGLE_API_KEY)
//   const headers = buildGoogleHeaders(useOAuth)

//   const payload = {
//     contents: [
//       {
//         role: "user",
//         parts: [
//           {
//             text:
//               `${systemInstruction}\n\n` +
//               `User prompt: ${originalPrompt}` +
//               `${stylePreset ? `\nStyle: ${stylePreset}` : ""}`,
//           },
//         ],
//       },
//     ],
//     generationConfig: {
//       temperature: 0.7,
//       topK: 40,
//       topP: 0.95,
//       maxOutputTokens: 500,
//     },
//   }

//   const res = await fetchWithRetries(url, {
//     method: "POST",
//     headers,
//     body: JSON.stringify(payload),
//   })

//   if (!res.ok) {
//     const txt = await res.text().catch(() => "")
//     console.error("[Gemini text] Request failed", { status: res.status, responseSnippet: txt?.slice?.(0, 2000) })
//     throw new Error(`Gemini enhancement failed: ${res.status} ${txt}`)
//   }

//   const json = await res.json()
//   const candidateText = extractTextFromGeminiResponse(json)

//   if (!candidateText) {
//     console.error("[Gemini text] Unexpected response", { raw: JSON.stringify(json).slice(0, 2000) })
//     throw new Error(`Unexpected Gemini response`)
//   }

//   const enhanced = candidateText.replace(/\s{2,}/g, " ").trim()
//   if (enhanced.length < 10) throw new Error("Gemini returned unusually short prompt")
//   return enhanced
// }

// export async function generateImageWithGemini({
//   prompt,
//   userId,
//   width = 1024,
//   height = 1024,
//   numVariations = 1,
//   stylePreset,
// }: {
//   prompt: string
//   userId?: string
//   width?: number
//   height?: number
//   numVariations?: number
//   stylePreset?: string | null
// }): Promise<string[]> {
//   if (!GOOGLE_API_KEY) throw new Error("GOOGLE_AI_API_KEY not configured")
//   if (!prompt || prompt.trim().length === 0) throw new Error("prompt required")

//   const model = GOOGLE_MODEL_IMAGE
//   const bucket = SUPABASE_BUCKET
//   const results: string[] = []
//   const iterations = Math.max(1, Math.min(1, numVariations))

//   const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateImage?key=${GOOGLE_API_KEY}`
//   const useOAuth = isOAuthToken(GOOGLE_API_KEY)
//   const headers = buildGoogleHeaders(useOAuth)

//   for (let i = 0; i < iterations; i++) {
//     let finalPrompt = prompt
//     if (stylePreset) finalPrompt = `${finalPrompt}, style: ${stylePreset}`

//     const imagePayload = {
//       prompt: finalPrompt,
//       number: 1,
//       size: {
//         width,
//         height,
//       },
//     }

//     try {
//       const r = await fetchWithRetries(
//         baseUrl,
//         {
//           method: "POST",
//           headers,
//           body: JSON.stringify(imagePayload),
//         },
//         3,
//         400
//       )

//       if (!r.ok) {
//         const txt = await r.text().catch(() => "")
//         console.error("[Gemini image] Request failed", { status: r.status, responseSnippet: txt?.slice?.(0, 2000) })
//         throw new Error(`Image generation failed: ${r.status} ${txt}`)
//       }

//       const j = await r.json()
//       const base64 = j?.image?.b64_json || j?.output?.[0]?.b64_json || j?.output?.[0]?.image?.b64 || j?.b64 || null

//       if (!base64) {
//         const maybeUrl = j?.output?.[0]?.url || j?.image?.url || j?.url || null
//         if (maybeUrl && typeof maybeUrl === "string" && maybeUrl.startsWith("http")) {
//           const imgResp = await fetch(maybeUrl)
//           if (!imgResp.ok) {
//             const txt = await imgResp.text().catch(() => "binary-fetch-failed")
//             throw new Error(`Failed to fetch image from Google URL: ${imgResp.status} ${txt}`)
//           }
//           const buffer = Buffer.from(await imgResp.arrayBuffer())
//           const filename = `generations/${userId || "anon"}/${Date.now()}-${uuidv4()}.png`

//           const { error: uploadError } = await supabaseServer.storage.from(bucket).upload(filename, buffer, {
//             contentType: "image/png",
//             upsert: false,
//           })
//           if (uploadError) throw new Error(`Supabase upload failed: ${uploadError.message}`)

//           const { data } = supabaseServer.storage.from(bucket).getPublicUrl(filename)
//           const publicUrl = data?.publicUrl ?? null
//           if (!publicUrl) throw new Error("Failed to get public URL")
//           results.push(publicUrl)
//           continue
//         }

//         throw new Error(`No image data in Google response`)
//       }

//       const buffer = Buffer.from(base64, "base64")
//       const filename = `generations/${userId || "anon"}/${Date.now()}-${uuidv4()}.png`

//       const { error: uploadError } = await supabaseServer.storage.from(bucket).upload(filename, buffer, {
//         contentType: "image/png",
//         upsert: false,
//       })

//       if (uploadError) {
//         throw new Error(`Supabase upload failed: ${uploadError.message}`)
//       }

//       const { data } = supabaseServer.storage.from(bucket).getPublicUrl(filename)
//       const publicUrl = data?.publicUrl ?? null
//       if (!publicUrl) throw new Error("Failed to get public URL")
//       results.push(publicUrl)
//     } catch (error) {
//       console.error(`[Gemini image] Iteration ${i + 1} failed:`, error)
//       throw error
//     }
//   }

//   return results
// }

// import { Buffer } from "buffer"
// import { supabaseServer } from "./supabase-server"
// import { v4 as uuidv4 } from "uuid"

// const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY
// const GOOGLE_MODEL_TEXT = process.env.GOOGLE_AI_MODEL_TEXT || "gemini-2.5-pro"
// const GOOGLE_MODEL_IMAGE = process.env.GOOGLE_AI_MODEL_IMAGE || "gemini-2.5-flash-image"
// const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "generations"

// function isOAuthToken(key?: string | null) {
//   return typeof key === "string" && key.startsWith("ya29.")
// }

// function buildGoogleHeaders(useOAuth: boolean) {
//   const headers: Record<string, string> = {
//     "Content-Type": "application/json",
//   }
//   if (useOAuth) {
//     headers["Authorization"] = `Bearer ${GOOGLE_API_KEY}`
//   } else if (GOOGLE_API_KEY) {
//     headers["x-goog-api-key"] = GOOGLE_API_KEY
//   }
//   return headers
// }

// function sleep(ms: number) {
//   return new Promise((res) => setTimeout(res, ms))
// }

// async function fetchWithRetries(
//   url: string,
//   options: RequestInit,
//   attempts = 3,
//   baseDelay = 300
// ) {
//   let lastErr: any = null
//   for (let i = 1; i <= attempts; i++) {
//     try {
//       const res = await fetch(url, options)
//       if (res.ok) return res

//       if ([429, 500, 502, 503].includes(res.status)) {
//         const ra = res.headers.get("retry-after")
//         const msg = await res.text().catch(() => "")
//         if (ra && !Number.isNaN(Number(ra))) {
//           const waitMs = Number(ra) * 1000
//           console.warn(
//             `[google-api] transient status ${res.status}, waiting ${waitMs}ms (retry ${i}/${attempts})`
//           )
//           await sleep(waitMs)
//         } else {
//           const delay = Math.pow(2, i - 1) * baseDelay + Math.floor(Math.random() * 200)
//           console.warn(
//             `[google-api] transient status ${res.status}, backing off ${delay}ms (retry ${i}/${attempts})`
//           )
//           await sleep(delay)
//         }
//         lastErr = new Error(`Transient status ${res.status}: ${msg}`)
//         continue
//       }

//       const txt = await res.text().catch(() => "")
//       throw new Error(`Non-retryable HTTP ${res.status}: ${txt}`)
//     } catch (err: any) {
//       lastErr = err
//       if (i === attempts) break
//       const delay = Math.pow(2, i - 1) * baseDelay + Math.floor(Math.random() * 200)
//       console.warn(
//         `[google-api] fetch error, retrying in ${delay}ms (attempt ${i}/${attempts})`,
//         err?.message ?? err
//       )
//       await sleep(delay)
//     }
//   }
//   throw lastErr ?? new Error("fetchWithRetries exhausted")
// }

// function extractTextFromGeminiResponse(json: any): string | null {
//   const cand = json?.candidates?.[0]
//   if (cand) {
//     const c = cand.content
//     if (c) {
//       if (Array.isArray(c.parts) && c.parts.length > 0) {
//         const joined = c.parts.map((p: any) => (typeof p.text === "string" ? p.text : "")).join(" ").trim()
//         if (joined) return joined
//       }
//       if (c?.content && Array.isArray(c.content) && typeof c.content[0]?.text === "string") {
//         return c.content[0].text.trim()
//       }
//       if (Array.isArray(c) && typeof c[0]?.text === "string") return c[0].text.trim()
//       if (typeof c === "string" && c.trim().length > 0) return c.trim()
//     }
//     if (Array.isArray(cand?.content) && typeof cand.content[0]?.text === "string")
//       return cand.content[0].text.trim()
//     if (cand?.content?.content && Array.isArray(cand.content.content)) {
//       const p = cand.content.content[0]
//       if (p?.parts && Array.isArray(p.parts)) {
//         const joined = p.parts.map((pr: any) => (typeof pr.text === "string" ? pr.text : "")).join(" ").trim()
//         if (joined) return joined
//       }
//     }
//   }

//   if (Array.isArray(json?.output) && typeof json.output[0]?.content?.[0]?.text === "string") {
//     return json.output[0].content[0].text.trim()
//   }

//   const msgContent = json?.output?.[0]?.message?.content
//   if (msgContent) {
//     if (typeof msgContent === "string" && msgContent.trim().length > 0) return msgContent.trim()
//     if (Array.isArray(msgContent) && typeof msgContent[0]?.text === "string") return msgContent[0].text.trim()
//   }

//   if (typeof json?.text === "string" && json.text.trim().length > 0) return json.text.trim()
//   if (typeof json?.response === "string" && json.response.trim().length > 0) return json.response.trim()

//   return null
// }

// export async function enhancePromptWithGemini(originalPrompt: string, stylePreset?: string) {
//   if (!GOOGLE_API_KEY) throw new Error("GOOGLE_AI_API_KEY not configured")
//   if (!originalPrompt || originalPrompt.trim().length === 0) {
//     throw new Error("original prompt required")
//   }

//   const systemInstruction = `You are an expert prompt engineer for AI image generation. Transform the user's brief into a detailed, vivid prompt for a commercial beauty product advertisement. Include: subject details, composition, camera technique, lighting setup, color palette, textures, mood, and professional photography keywords. Return ONLY the enhanced prompt as a single paragraph.`

//   const model = GOOGLE_MODEL_TEXT
//   const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
//   const useOAuth = isOAuthToken(GOOGLE_API_KEY)
//   const headers = buildGoogleHeaders(useOAuth)

//   const payload = {
//     contents: [
//       {
//         role: "user",
//         parts: [
//           {
//             text:
//               `${systemInstruction}\n\n` +
//               `User prompt: ${originalPrompt}` +
//               `${stylePreset ? `\nStyle: ${stylePreset}` : ""}`,
//           },
//         ],
//       },
//     ],
//   }

//   const res = await fetchWithRetries(url, {
//     method: "POST",
//     headers,
//     body: JSON.stringify(payload),
//   })

//   if (!res.ok) {
//     const txt = await res.text().catch(() => "")
//     console.error("[Gemini text] Request failed", { status: res.status, responseSnippet: txt?.slice?.(0, 2000) })
//     throw new Error(`Gemini enhancement failed: ${res.status} ${txt}`)
//   }

//   const json = await res.json()
//   const candidateText = extractTextFromGeminiResponse(json)

//   if (!candidateText) {
//     console.error("[Gemini text] Unexpected response", { raw: JSON.stringify(json).slice(0, 2000) })
//     throw new Error(`Unexpected Gemini response`)
//   }

//   const enhanced = candidateText.replace(/\s{2,}/g, " ").trim()
//   if (enhanced.length < 10) throw new Error("Gemini returned unusually short prompt")
//   return enhanced
// }

// export async function generateImageWithGemini({
//   prompt,
//   userId,
//   width = 1024,
//   height = 1024,
//   numVariations = 1,
//   stylePreset,
// }: {
//   prompt: string
//   userId?: string
//   width?: number
//   height?: number
//   numVariations?: number
//   stylePreset?: string | null
// }): Promise<string[]> {
//   if (!GOOGLE_API_KEY) throw new Error("GOOGLE_AI_API_KEY not configured")
//   if (!prompt || prompt.trim().length === 0) throw new Error("prompt required")

//   const model = GOOGLE_MODEL_IMAGE
//   const bucket = SUPABASE_BUCKET
//   const results: string[] = []
//   const iterations = Math.max(1, Math.min(1, numVariations))

//   const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateImage`
//   const useOAuth = isOAuthToken(GOOGLE_API_KEY)
//   const headers = buildGoogleHeaders(useOAuth)

//   for (let i = 0; i < iterations; i++) {
//     let finalPrompt = prompt
//     if (stylePreset) finalPrompt = `${finalPrompt}, style: ${stylePreset}`

//     const imagePayload = {
//       prompt: finalPrompt,
//       size: { width, height },
//     }

//     const r = await fetchWithRetries(
//       baseUrl,
//       {
//         method: "POST",
//         headers,
//         body: JSON.stringify(imagePayload),
//       },
//       3,
//       400
//     )

//     if (!r.ok) {
//       const txt = await r.text().catch(() => "")
//       console.error("[Gemini image] Request failed", { status: r.status, responseSnippet: txt?.slice?.(0, 2000) })
//       throw new Error(`Image generation failed: ${r.status} ${txt}`)
//     }

//     const j = await r.json()
//     const base64 = j?.image?.b64_json || j?.output?.[0]?.b64_json || j?.output?.[0]?.image?.b64 || j?.b64 || null

//     if (!base64) {
//       const maybeUrl = j?.output?.[0]?.url || j?.image?.url || j?.url || null
//       if (maybeUrl && typeof maybeUrl === "string" && maybeUrl.startsWith("http")) {
//         const imgResp = await fetch(maybeUrl)
//         if (!imgResp.ok) {
//           const txt = await imgResp.text().catch(() => "binary-fetch-failed")
//           throw new Error(`Failed to fetch image from Google URL: ${imgResp.status} ${txt}`)
//         }
//         const buffer = Buffer.from(await imgResp.arrayBuffer())
//         const filename = `generations/${userId || "anon"}/${Date.now()}-${uuidv4()}.png`

//         const { error: uploadError } = await supabaseServer.storage.from(bucket).upload(filename, buffer, {
//           contentType: "image/png",
//           upsert: false,
//         })
//         if (uploadError) throw new Error(`Supabase upload failed: ${uploadError.message}`)

//         const { data } = supabaseServer.storage.from(bucket).getPublicUrl(filename)
//         const publicUrl = data?.publicUrl ?? null
//         if (!publicUrl) throw new Error("Failed to get public URL")
//         results.push(publicUrl)
//         continue
//       }

//       throw new Error(`No image data in Google response`)
//     }

//     const buffer = Buffer.from(base64, "base64")
//     const filename = `generations/${userId || "anon"}/${Date.now()}-${uuidv4()}.png`

//     const { error: uploadError } = await supabaseServer.storage.from(bucket).upload(filename, buffer, {
//       contentType: "image/png",
//       upsert: false,
//     })

//     if (uploadError) {
//       throw new Error(`Supabase upload failed: ${uploadError.message}`)
//     }

//     const { data } = supabaseServer.storage.from(bucket).getPublicUrl(filename)
//     const publicUrl = data?.publicUrl ?? null
//     if (!publicUrl) throw new Error("Failed to get public URL")
//     results.push(publicUrl)
//   }

//   return results
// }
