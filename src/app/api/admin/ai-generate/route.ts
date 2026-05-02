import { NextResponse } from "next/server";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const PROMPT = (topic: string) =>
  `Write a high-quality, SEO-optimized anime blog post about: "${topic}"

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "title": "engaging SEO title",
  "slug": "url-friendly-slug",
  "summary": "2-3 sentence meta description for SEO",
  "content": "full article in HTML format, 600-900 words, with <h2> subheadings, engaging intro, and a conclusion that recommends downloading the Mugen Anime app to watch",
  "tags": ["tag1", "tag2", "tag3"]
}`;

// ─── Provider handlers ────────────────────────────────────────────────────────

async function callOpenRouter(apiKey: string, model: string, prompt: string) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      "X-Title": "Mugen Anime Admin",
    },
    body: JSON.stringify({
      model: model || "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message ?? "OpenRouter API error");
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function callGemini(apiKey: string, model: string, prompt: string) {
  const modelName = model || "gemini-1.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message ?? "Gemini API error");
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callOpenAI(apiKey: string, model: string, prompt: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message ?? "OpenAI API error");
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function callClaude(apiKey: string, model: string, prompt: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "claude-3-haiku-20240307",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message ?? "Claude API error");
  }

  const data = await res.json();
  return data?.content?.[0]?.text ?? "";
}

// ─── Route handler ────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const { topic } = body as { topic: string };

  if (!topic) return NextResponse.json({ error: "Topic required" }, { status: 400 });

  // Fetch settings from DB
  const settings = await prisma.systemSetting.findMany();
  const config: Record<string, string> = {};
  for (const s of settings) config[s.key] = s.value;

  let effectiveProvider = null;
  let effectiveKey = "";
  let openRouterModel = config.openrouterModel || "";
  let geminiModel = config.geminiModel || "gemini-1.5-flash";
  let openaiModel = config.openaiModel || "gpt-4o-mini";
  let claudeModel = config.claudeModel || "claude-3-haiku-20240307";

  if (config.openrouter) {
    effectiveProvider = "openrouter";
    effectiveKey = config.openrouter;
  } else if (config.gemini) {
    effectiveProvider = "gemini";
    effectiveKey = config.gemini;
  } else if (config.openai) {
    effectiveProvider = "openai";
    effectiveKey = config.openai;
  } else if (config.claude) {
    effectiveProvider = "claude";
    effectiveKey = config.claude;
  } else if (process.env.GEMINI_API_KEY) {
    effectiveProvider = "gemini";
    effectiveKey = process.env.GEMINI_API_KEY;
  }

  if (!effectiveKey || !effectiveProvider) {
    return NextResponse.json(
      { error: "No AI API key configured. Please add one in Settings." },
      { status: 500 }
    );
  }

  const prompt = PROMPT(topic);

  try {
    let text = "";

    switch (effectiveProvider) {
      case "openrouter":
        text = await callOpenRouter(effectiveKey, openRouterModel || "openai/gpt-4o-mini", prompt);
        break;
      case "gemini":
        text = await callGemini(effectiveKey, geminiModel, prompt);
        break;
      case "openai":
        text = await callOpenAI(effectiveKey, openaiModel, prompt);
        break;
      case "claude":
        text = await callClaude(effectiveKey, claudeModel, prompt);
        break;
      default:
        return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Invalid AI response format", rawText: text }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    parsed.slug = parsed.slug || slugify(parsed.title || topic);

    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI generation failed" },
      { status: 500 }
    );
  }
}
