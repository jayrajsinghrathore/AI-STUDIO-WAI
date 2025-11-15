import { NextRequest, NextResponse } from "next/server"
import { generateImageWithGemini } from "@/lib/google-api"
import { supabaseServer } from "@/lib/supabase-server"
import { createServerSupabaseClient, getServerUser } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 })
    }

    const body = await req.json()
    const { prompt, enhancedPrompt, stylePreset, width = 1024, height = 1024 } = body ?? {}

    const finalPrompt = enhancedPrompt?.trim() ? enhancedPrompt : prompt

    if (!finalPrompt || typeof finalPrompt !== "string" || finalPrompt.trim().length === 0) {
      return NextResponse.json({ error: "prompt or enhancedPrompt required" }, { status: 400 })
    }

    let urls: string[] = []
    try {
      urls = await generateImageWithGemini({
        prompt: finalPrompt,
        userId: user.id,
        width,
        height,
        numVariations: 1,
        stylePreset,
      })
    } catch (generateError: any) {
      console.error("[api/generate] Image generation failed:", generateError)
      return NextResponse.json(
        { 
          error: "Image generation failed. Please check your API key and try again.",
          details: generateError?.message 
        }, 
        { status: 500 }
      )
    }

    if (!urls || urls.length === 0) {
      return NextResponse.json({ error: "No images were generated" }, { status: 500 })
    }

    const { error: insertError, data } = await supabaseServer.from("generations").insert([
      {
        user_id: user.id,
        original_prompt: prompt ?? null,
        enhanced_prompt: enhancedPrompt ?? finalPrompt,
        // style_preset: ""
         image_url: urls,
         image : "",
        created_at: new Date().toISOString(),
      },
    ]).select()

    if (insertError) {
      console.error("DB insert error:", insertError)
      // Still return success with images even if DB insert fails
      return NextResponse.json({ imageUrls: urls, warning: "db_insert_failed" }, { status: 200 })
    }

    return NextResponse.json({ imageUrls: urls, generationId: "5"}, { status: 200 })
  } catch (err: any) {
    console.error("Generate error:", err)
    return NextResponse.json({ error: err?.message || "Image generation failed" }, { status: 500 })
  }
}  