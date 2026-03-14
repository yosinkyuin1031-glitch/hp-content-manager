import { NextRequest, NextResponse } from "next/server";

interface PartInfo {
  type: string;
  name: string;
  html: string;
}

export async function POST(req: NextRequest) {
  const { symptom, clinicName, area, specialty, ownerName, bookingUrl, apiKey, parts } = await req.json();

  if (!apiKey) {
    return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 400 });
  }

  // Build parts insertion instructions if parts are provided
  let partsInstruction = "";
  if (parts && Array.isArray(parts) && parts.length > 0) {
    const partsDescriptions = (parts as PartInfo[]).map((p) => {
      return `【${p.name}（${p.type}）】\n${p.html}`;
    }).join("\n\n");

    partsInstruction = `

【挿入パーツ】
以下のHTMLパーツを、生成するコンテンツの適切な位置にそのまま挿入してください：
- profile（院長プロフィール）→ 導入セクションの後
- voice（患者様の声）→ よくある質問の前
- faq（FAQ）→ よくある質問セクションの代わりまたは追加
- cta（予約誘導）→ コンテンツの最後
- access（アクセス情報）→ CTAの前
- symptom-list（症状一覧）→ コンテンツの最後付近
- custom（カスタム）→ 適切と思われる位置

${partsDescriptions}

パーツのHTMLはそのまま変更せずに挿入してください。`;
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
3. 本文HTML（以下のセクション構成、H1見出しを本文HTMLの先頭に含めること）:
   - H1見出し（本文の最初の要素として<h1>タグで記述）
   - 導入（${symptom}でお悩みの方への共感）
   - ${symptom}の原因と症状の説明
   - 当院の${symptom}への施術アプローチ
   - 施術の流れ
   - ${symptom}が改善された患者様の声（架空で2-3件）
   - よくある質問（3-5件）
   - 最後のCTA（予約への誘導）

HTMLはセマンティックに構造化し、見出しタグを適切に使ってください。
CSSクラスは含めず、純粋なHTMLタグで出力してください。
重要：H1見出しはcontentフィールドの先頭に<h1>タグとして含めてください。h1フィールドには同じテキストを入れますが、表示用のH1はcontent内に含めてください。${partsInstruction}

JSON形式で回答：
{
  "title": "タイトルタグ",
  "metaDescription": "meta description",
  "h1": "H1見出しテキスト",
  "content": "<h1>H1見出し</h1>から始まるHTML本文（パーツ含む）",
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
      const errorMessage = err.error?.message || `API error ${res.status}`;
      return NextResponse.json({ error: errorMessage }, { status: res.status });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ result: parsed });
      } catch (parseError) {
        return NextResponse.json(
          { error: `JSONの解析に失敗しました: ${parseError instanceof Error ? parseError.message : "不明なエラー"}` },
          { status: 500 }
        );
      }
    }
    return NextResponse.json({ error: "AIレスポンスからJSONを抽出できませんでした" }, { status: 500 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ページ生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
