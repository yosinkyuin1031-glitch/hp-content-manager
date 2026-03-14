import { NextRequest, NextResponse } from "next/server";
import { GenerationConfig } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { keyword, category, config } = body as {
    keyword: string;
    category: "symptom" | "blog";
    config: GenerationConfig;
  };

  if (!keyword) {
    return NextResponse.json({ error: "キーワードを入力してください" }, { status: 400 });
  }

  const apiKey = config.anthropicKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Anthropic APIキーが設定されていません" }, { status: 400 });
  }

  const systemPrompt = category === "symptom"
    ? `あなたは整体院・治療院のSEOコンテンツライターです。${config.clinicName}（${config.area}）の${config.specialty}に特化した症状ページ用のブログ記事を作成します。`
    : `あなたは整体院・治療院のブログライターです。${config.clinicName}（${config.area}）のブログ記事を作成します。読みやすく、患者さんに寄り添った文章を書いてください。`;

  const prompt = `以下のキーワードでブログ記事を作成してください。

【キーワード】${keyword}
【院名】${config.clinicName}
【エリア】${config.area}
【専門】${config.specialty}
【院長】${config.ownerName}

要件:
- SEOを意識したタイトル（30-40文字）
- メタディスクリプション（120文字以内）
- H2見出しを4-6個使用
- 各見出しの下に200-400文字の本文
- 専門的すぎず患者さんが読みやすい文章
- ${config.area}の地域名を自然に含める
- 最後にCTA（来院案内）を含める
- 電話番号: ${config.phone}

JSON形式で回答:
{
  "title": "記事タイトル",
  "metaDescription": "メタディスクリプション",
  "content": "<h2>見出し1</h2><p>本文...</p><h2>見出し2</h2><p>本文...</p>..."
}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [
          { role: "user", content: prompt },
        ],
        system: systemPrompt,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `API error: ${err}` }, { status: 500 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "AI応答の解析に失敗しました" }, { status: 500 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
