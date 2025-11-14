// app/api/debug/list-models/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) return NextResponse.json({ error: "GOOGLE_AI_API_KEY not set (server)" }, { status: 500 });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
    const text = await res.text();
    // return full response body for debugging (safe server-only route)
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
