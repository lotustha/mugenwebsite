import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-openrouter-key");
  if (!apiKey) {
    return NextResponse.json({ error: "OpenRouter API key required" }, { status: 401 });
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
        "X-Title": "Mugen Anime Admin",
      },
      next: { revalidate: 300 }, // cache for 5 minutes
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: (err as { error?: { message?: string } })?.error?.message ?? "OpenRouter API error" },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Sort by name, filter out deprecated/embedding-only models
    const models = (data.data ?? [])
      .filter((m: { id: string; context_length?: number }) => m.id && m.context_length)
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

    return NextResponse.json({ models });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch models" },
      { status: 500 }
    );
  }
}
