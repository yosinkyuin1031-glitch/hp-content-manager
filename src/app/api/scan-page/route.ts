import { NextRequest, NextResponse } from "next/server";

interface ScanResult {
  h1: string;
  h2List: string[];
  h3List: string[];
  wordCount: number;
  imageCount: number;
  hasCTA: boolean;
  ctaDetails: string;
  hasTestimonials: boolean;
  testimonialCount: number;
  hasPricing: boolean;
  hasFAQ: boolean;
  faqCount: number;
  hasAccessInfo: boolean;
  hasOwnerProfile: boolean;
  hasTreatmentFlow: boolean;
  hasReasons: boolean;
  hasSymptomExplanation: boolean;
  overallScore: number;
  structureScore: number;
  contentScore: number;
  ctaScore: number;
  seoScore: number;
  issues: string[];
  suggestions: string[];
}

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url) {
    return NextResponse.json({ error: "URLが指定されていません" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HPContentManager/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `ページの取得に失敗しました (${res.status})` }, { status: 400 });
    }

    const html = await res.text();
    const result = analyzeHTML(html);

    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "スキャン中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

function analyzeHTML(html: string): ScanResult {
  // Extract body content (remove scripts, styles, nav, footer for word count)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;

  // Strip HTML tags for text analysis
  const textContent = bodyHtml
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // H1
  const h1Match = bodyHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, "").trim() : "";

  // H2s
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const h2List: string[] = [];
  let h2m;
  while ((h2m = h2Regex.exec(bodyHtml)) !== null) {
    h2List.push(h2m[1].replace(/<[^>]+>/g, "").trim());
  }

  // H3s
  const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  const h3List: string[] = [];
  let h3m;
  while ((h3m = h3Regex.exec(bodyHtml)) !== null) {
    h3List.push(h3m[1].replace(/<[^>]+>/g, "").trim());
  }

  // Word count (Japanese characters)
  const wordCount = textContent.length;

  // Images
  const imgRegex = /<img[^>]+>/gi;
  const imgMatches = bodyHtml.match(imgRegex);
  const imageCount = imgMatches ? imgMatches.length : 0;

  // CTA detection
  const ctaPatterns = [
    /電話/i, /tel/i, /070-8498-2968/,
    /LINE/i, /予約/i, /お問い合わせ/,
    /ご予約/i, /お電話/i,
  ];
  const ctaMatches = ctaPatterns.filter((p) => p.test(bodyHtml));
  const hasCTA = ctaMatches.length >= 2;
  const ctaDetails = [
    /電話|tel|070-8498-2968/i.test(bodyHtml) ? "電話" : "",
    /LINE/i.test(bodyHtml) ? "LINE" : "",
    /予約|ご予約/i.test(bodyHtml) ? "予約導線" : "",
    /お問い合わせ/i.test(bodyHtml) ? "お問い合わせ" : "",
  ].filter(Boolean).join("、");

  // Testimonials
  const testimonialPatterns = [/お客様の声/i, /患者様の声/i, /喜びの声/i, /改善/, /voice/i];
  const hasTestimonials = testimonialPatterns.some((p) => p.test(bodyHtml));
  const testimonialH3s = h3List.filter((h) => /【.*】/.test(h));
  const testimonialCount = testimonialH3s.length;

  // Pricing
  const hasPricing = /料金|メニュー|初回.*円|通常.*円|回数券/i.test(bodyHtml);

  // FAQ
  const hasFAQ = /よくある質問|FAQ|Q\s*[.．&]/i.test(bodyHtml);
  const faqH3s = h3List.filter((h) => /^Q[.．\s]|よくある/.test(h));
  const faqCount = faqH3s.length;

  // Access info
  const hasAccessInfo = /アクセス|住所|〒|地図|MAP|駅.*徒歩/i.test(bodyHtml);

  // Owner profile
  const hasOwnerProfile = /院長.*メッセージ|プロフィール|院長紹介|院長から/i.test(bodyHtml);

  // Treatment flow
  const hasTreatmentFlow = /施術の流れ|ステップ|STEP|①問診|カウンセリング.*検査/i.test(bodyHtml);

  // Reasons (選ばれる理由)
  const hasReasons = /選ばれる.*理由|当院.*選ばれ|特徴/i.test(bodyHtml);

  // Symptom explanation
  const hasSymptomExplanation = /とは|原因|症状.*説明|メカニズム|なぜ.*起こる/i.test(bodyHtml);

  // Scoring
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Structure score (0-100)
  let structureScore = 0;
  if (h1) structureScore += 20; else issues.push("H1タグがありません");
  if (h2List.length >= 5) structureScore += 20; else if (h2List.length >= 3) structureScore += 10; else issues.push(`H2見出しが${h2List.length}個しかありません（推奨5個以上）`);
  if (h3List.length >= 5) structureScore += 20; else if (h3List.length >= 3) structureScore += 10;
  if (wordCount >= 5000) structureScore += 20; else if (wordCount >= 3000) structureScore += 10; else issues.push(`文字数が${wordCount}文字です（推奨5,000文字以上）`);
  if (imageCount >= 10) structureScore += 20; else if (imageCount >= 5) structureScore += 10; else issues.push(`画像が${imageCount}枚です（推奨10枚以上）`);

  // Content score (0-100)
  let contentScore = 0;
  if (hasTestimonials) contentScore += 20; else { issues.push("お客様の声セクションがありません"); suggestions.push("患者様の改善事例を3件以上掲載しましょう"); }
  if (testimonialCount >= 3) contentScore += 10; else if (hasTestimonials) suggestions.push(`お客様の声を${3 - testimonialCount}件追加しましょう（現在${testimonialCount}件）`);
  if (hasOwnerProfile) contentScore += 15; else { issues.push("院長プロフィールがありません"); suggestions.push("院長のメッセージ・プロフィールを追加しましょう"); }
  if (hasTreatmentFlow) contentScore += 15; else { issues.push("施術の流れがありません"); suggestions.push("施術の流れ（7ステップ）を追加しましょう"); }
  if (hasReasons) contentScore += 15; else { issues.push("選ばれる理由がありません"); suggestions.push("当院が選ばれる理由（5つ）を追加しましょう"); }
  if (hasSymptomExplanation) contentScore += 15; else { issues.push("症状の詳しい説明がありません"); suggestions.push("症状の原因・メカニズムの説明を追加しましょう"); }
  if (hasFAQ) contentScore += 10; else { suggestions.push("よくある質問（FAQ）セクションを追加しましょう（SEO効果大）"); }

  // CTA score (0-100)
  let ctaScore = 0;
  if (/電話|tel|070/i.test(bodyHtml)) ctaScore += 30; else suggestions.push("電話番号のCTAを追加しましょう");
  if (/LINE/i.test(bodyHtml)) ctaScore += 30; else suggestions.push("LINE予約のCTAを追加しましょう");
  if (/予約|ご予約/i.test(bodyHtml)) ctaScore += 20;
  // Multiple CTA placements
  const ctaButtonCount = (bodyHtml.match(/電話をかける|LINE.*予約|今すぐ.*予約|お問い合わせ/gi) || []).length;
  if (ctaButtonCount >= 3) ctaScore += 20; else if (ctaButtonCount >= 1) ctaScore += 10; else suggestions.push("CTA（予約ボタン）をページ内に複数配置しましょう");

  // SEO score (0-100)
  let seoScore = 0;
  if (h1) seoScore += 25;
  if (h2List.length >= 5) seoScore += 20; else if (h2List.length >= 3) seoScore += 10;
  if (wordCount >= 5000) seoScore += 25; else if (wordCount >= 3000) seoScore += 15;
  if (hasFAQ) seoScore += 15; else suggestions.push("FAQ構造化データでAI検索からの流入を狙いましょう");
  if (hasAccessInfo) seoScore += 15; else suggestions.push("地域名・アクセス情報を追加してローカルSEOを強化しましょう");

  // Overall score
  const overallScore = Math.round((structureScore + contentScore + ctaScore + seoScore) / 4);

  return {
    h1,
    h2List,
    h3List,
    wordCount,
    imageCount,
    hasCTA,
    ctaDetails,
    hasTestimonials,
    testimonialCount,
    hasPricing,
    hasFAQ,
    faqCount,
    hasAccessInfo,
    hasOwnerProfile,
    hasTreatmentFlow,
    hasReasons,
    hasSymptomExplanation,
    overallScore,
    structureScore,
    contentScore,
    ctaScore,
    seoScore,
    issues,
    suggestions,
  };
}
