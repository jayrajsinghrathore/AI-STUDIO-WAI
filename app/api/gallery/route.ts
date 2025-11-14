import { NextRequest, NextResponse } from "next/server"
import { getServerUser } from "@/lib/supabase/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    const { data, error, count } = await supabaseServer
      .from("generations")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      generations: data || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (err: any) {
    console.error("Gallery error:", err)
    return NextResponse.json({ error: err?.message || "Failed to fetch gallery" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { generationId } = body

    if (!generationId) {
      return NextResponse.json({ error: "generationId required" }, { status: 400 })
    }

    const { data: generation, error: fetchError } = await supabaseServer
      .from("generations")
      .select("id")
      .eq("id", generationId)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 })
    }

    const { error: deleteError } = await supabaseServer
      .from("generations")
      .delete()
      .eq("id", generationId)
      .eq("user_id", user.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Delete error:", err)
    return NextResponse.json({ error: err?.message || "Failed to delete" }, { status: 500 })
  }
}
