import { NextRequest, NextResponse } from "next/server"
import { enhancePromptWithGemini } from "@/lib/google-api"

const TIMEOUT_MS = 25000
const RETRY_AFTER_SECONDS = 3

function isTransientError(msg: string) {
  if (!msg) return false
  const lower = msg.toLowerCase()
  return (
    lower.includes("unavailable") ||
    lower.includes("overloaded") ||
    lower.includes("503") ||
    lower.includes("too many requests") ||
    lower.includes("rate limit")
  )
}

function isClientError(msg: string) {
  if (!msg) return false
  const lower = msg.toLowerCase()
  return lower.includes("invalid argument") || lower.includes("invalid")
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const { prompt, stylePreset } = body ?? {}

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 })
    }

    const enhancementPromise = enhancePromptWithGemini(prompt, stylePreset)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("enhancement_timeout")), TIMEOUT_MS)
    )

    let enhanced: string
    try {
      enhanced = await Promise.race([enhancementPromise, timeoutPromise])
    } catch (err: any) {
      const msg = String(err?.message ?? err)

      if (msg === "enhancement_timeout") {
        console.error("[Enhance] Timeout after", TIMEOUT_MS, "ms")
        return new NextResponse(JSON.stringify({ error: "Service timed out. Please try again." }), {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(RETRY_AFTER_SECONDS),
          },
        })
      }

      if (isTransientError(msg)) {
        console.warn("[Enhance] Transient error:", msg)
        return new NextResponse(JSON.stringify({ error: "Service temporarily busy. Please try again." }), {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(RETRY_AFTER_SECONDS),
          },
        })
      }

      if (isClientError(msg)) {
        console.warn("[Enhance] Client error:", msg)
        return NextResponse.json({ error: msg }, { status: 400 })
      }

      throw err
    }

    return NextResponse.json({ enhancedPrompt: enhanced }, { status: 200 })
  } catch (err: any) {
    const raw = String(err?.message ?? err)
    console.error("[Enhance] Unexpected error:", raw)

    if (isTransientError(raw)) {
      return new NextResponse(JSON.stringify({ error: "Service temporarily busy. Please try again." }), {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(RETRY_AFTER_SECONDS),
        },
      })
    }

    return NextResponse.json({ error: "Enhancement failed" }, { status: 500 })
  }
}
