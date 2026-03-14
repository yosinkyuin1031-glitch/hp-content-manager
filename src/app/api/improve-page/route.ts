import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { currentContent, title, config, parts } = await req.json();

  if (!config?.anthropicKey) {
    return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 400 });
  }

  const prompt = `あなたは整体院のWebコンテンツ改善の専門家です。

以下は「${title}」の既存ページのHTMLコンテンツです。このページを公開できるレベルに改善してください。

【院情報】
- 院名: ${config.clinicName || "大口神経整体院"}
- エリア: ${config.area || "大阪市住吉区長居"}
- 専門: ${config.specialty || "重症な慢性痛・神経痛"}
- 院長: ${config.ownerName || "大口陽平"}
- 電話: ${config.phone || "070-8498-2968"}

【既存コンテンツ】
${currentContent}

【共通パーツ（そのまま適切な位置に挿入）】
${parts || "（パーツなし）"}

【改善指示】
1. 既存の内容は活かしつつ、足りないセクションを追加してください
2. 推奨セクション構成（不足しているものを追加）:
   - 導入・こんなお悩みチェックリスト
   - 症状の原因・メカニズムの説明
   - 放っておくとどうなるか
   - 当院の施術アプローチ
   - 選ばれる5つの理由
   - 施術の流れ（7ステップ）
   - お客様の声（3件）
   - よくある質問（FAQ 5件）
   - 院長からのメッセージ
   - 料金案内
   - アクセス情報
   - 予約CTA
3. 共通パーツが提供されている場合は、そのHTMLをそのまま適切な位置に挿入
4. 文字数は5,000文字以上を目標
5. H1/H2/H3の見出し構造を適切に
6. 地域名（大阪市住吉区長居、長居駅）を自然に含める
7. CSSクラスは含めず純粋なHTMLで出力
8. 既存の良いコンテンツは絶対に削除しない

改善後のHTML全文のみを出力してください。説明文は不要です。<h1>タグから始めてください。`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error?.message || `API error ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";

    // Extract HTML content (might be wrapped in code blocks)
    let html = text;
    const codeBlockMatch = text.match(/```html?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      html = codeBlockMatch[1].trim();
    } else if (text.includes("<h1")) {
      // Already raw HTML
      html = text.trim();
    }

    return NextResponse.json({ result: html });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "改善処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
