import { NextRequest, NextResponse } from "next/server";

interface TemplateSection {
  id: string;
  name: string;
  type: string;
  required: boolean;
  prompt: string;
  fixedHtml?: string;
}

interface PageTemplate {
  sections: TemplateSection[];
  titleTemplate: string;
  metaTemplate: string;
}

interface GenerationConfig {
  clinicName: string;
  area: string;
  specialty: string;
  ownerName: string;
  phone: string;
  websiteUrl: string;
  bookingUrl: string;
  anthropicKey: string;
}

interface PartInfo {
  type: string;
  name: string;
  html: string;
}

function replaceVars(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

export async function POST(req: NextRequest) {
  const { symptom, template, config, parts } = await req.json() as {
    symptom: string;
    template: PageTemplate;
    config: GenerationConfig;
    parts?: PartInfo[];
  };

  if (!config.anthropicKey) {
    return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 400 });
  }

  const vars: Record<string, string> = {
    symptom,
    clinicName: config.clinicName || "大口神経整体院",
    area: config.area || "大阪市住吉区長居",
    specialty: config.specialty || "重症な慢性痛・神経痛",
    ownerName: config.ownerName || "大口陽平",
    phone: config.phone || "070-8498-2968",
    websiteUrl: config.websiteUrl || "",
    bookingUrl: config.bookingUrl || "",
  };

  // Build title and meta from template
  const titleText = replaceVars(template.titleTemplate, vars);
  const metaText = replaceVars(template.metaTemplate, vars);

  // Build section instructions
  const sectionPrompts = template.sections.map((sec, i) => {
    const prompt = replaceVars(sec.prompt, vars);
    return `### セクション${i + 1}: ${sec.name}（種別: ${sec.type}）
${prompt}`;
  }).join("\n\n");

  // Parts insertion
  let partsInstruction = "";
  if (parts && parts.length > 0) {
    const partsText = parts.map((p) => `【${p.name}（${p.type}）】\n${p.html}`).join("\n\n");
    partsInstruction = `\n\n【固定パーツ】以下のHTMLパーツを適切な位置にそのまま挿入してください：\n${partsText}`;
  }

  const prompt = `あなたは整体院・治療院のSEOに特化したWebコンテンツライターです。
大口神経整体院（大阪市住吉区長居、重症な慢性痛・神経痛専門）の「${symptom}」症状別ページを作成してください。

【院情報】
- 院名: ${vars.clinicName}
- エリア: ${vars.area}
- 専門: ${vars.specialty}
- 院長: ${vars.ownerName}
- 電話: ${vars.phone}
- 予約URL: ${vars.bookingUrl}

【ページ構成 - 以下のセクションを順番通りに作成】

${sectionPrompts}

【SEO設定】
- title: 「${titleText}」（60文字以内に調整）
- meta description: 「${metaText}」（120文字以内に調整）

【重要な制約】
- 整体院のWebサイトに実際に掲載するコンテンツです
- H1は症状名を含む見出し（contentの先頭に<h1>タグで）
- H2/H3の見出し構造を適切に使う
- お客様の声は架空でOKだが、リアルな体験談形式で
- CSSクラスは含めず純粋なHTMLタグで出力
- 電話番号070-8498-2968、LINE予約への誘導を適切に配置
- 文字数は8,000文字以上を目標
- 地域名（大阪市住吉区長居、長居駅）を自然に含める${partsInstruction}

JSON形式で回答：
{
  "title": "タイトルタグ",
  "metaDescription": "meta description",
  "h1": "H1見出しテキスト",
  "content": "<h1>...</h1>から始まるHTML本文",
  "slug": "URLスラッグ（英語小文字ハイフン区切り）"
}`;

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
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ result: parsed });
      } catch {
        return NextResponse.json({ error: "JSONの解析に失敗しました" }, { status: 500 });
      }
    }
    return NextResponse.json({ error: "AIレスポンスからJSONを抽出できませんでした" }, { status: 500 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
