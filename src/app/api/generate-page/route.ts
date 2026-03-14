import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { symptom, clinicName, area, specialty, ownerName, bookingUrl, apiKey } = await req.json();

  if (!apiKey) {
    return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 400 });
  }

  const prompt = `あなたは整体院・治療院のSEOに特化したWebコンテンツライターです。

以下の情報をもとに、「${symptom}」の症状別ページのHTMLコンテンツを作成してください。

【院情報】
- 院名: ${clinicName}
- エリア: ${area}
- 専門: ${specialty}
- 院長名: ${ownerName}
- 予約URL: ${bookingUrl}

【要件】
1. タイトルタグ（60文字以内、「${area} ${symptom}」を含む）
2. meta description（120文字以内）
3. H1見出し
4. 本文HTML（以下のセクション構成）:
   - 導入（${symptom}でお悩みの方への共感）
   - ${symptom}の原因と症状の説明
   - 当院の${symptom}への施術アプローチ
   - 施術の流れ
   - ${symptom}が改善された患者様の声（架空で2-3件）
   - よくある質問（3-5件）
   - 最後のCTA（予約への誘導）

HTMLはセマンティックに構造化し、見出しタグを適切に使ってください。
CSSクラスは含めず、純粋なHTMLタグで出力してください。

JSON形式で回答：
{
  "title": "タイトルタグ",
  "metaDescription": "meta description",
  "h1": "H1見出し",
  "content": "HTML本文",
  "slug": "URLスラッグ（英語小文字ハイフン区切り）"
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
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error?.message || `API error ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ result: parsed });
    }
    return NextResponse.json({ error: "レスポンスの解析に失敗" }, { status: 500 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "エラー" }, { status: 500 });
  }
}
