import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/studio"

  if (code) {
    const supabase = await createServerSupabaseClient()
    // await supabase.auth.exchangeCodeForSession(code)
  }

  // redirect the user to the specified redirect URL
  return NextResponse.redirect(new URL(next, request.url))
}
