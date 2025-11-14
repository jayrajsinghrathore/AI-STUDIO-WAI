"use client"

import { createBrowserClient } from "@supabase/ssr"

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (supabaseInstance) return supabaseInstance

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error("Supabase credentials not configured")
  }

  supabaseInstance = createBrowserClient(url, key)
  return supabaseInstance
}

export function getSupabaseClient() {
  if (!supabaseInstance) {
    return createClient()
  }
  return supabaseInstance
}
