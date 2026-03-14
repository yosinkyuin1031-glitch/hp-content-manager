export interface WPConnection {
  siteUrl: string;
  username: string;
  appPassword: string;
}

export interface SymptomPage {
  id: string;
  symptom: string; // 症状名（腰痛、肩こり等）
  slug: string; // URLスラッグ
  title: string;
  metaDescription: string;
  h1: string;
  content: string; // HTML
  status: "draft" | "generated" | "posted";
  wpPostId?: number;
  wpUrl?: string;
  createdAt: string;
}

export interface ContentPart {
  id: string;
  name: string; // パーツ名
  type: "cta" | "profile" | "voice" | "access" | "faq" | "symptom-list" | "custom";
  html: string;
  description: string;
  usedIn: string[]; // 使用ページ一覧
}

export interface BlogDraft {
  id: string;
  title: string;
  content: string;
  category: "symptom" | "blog";
  keyword: string;
  metaDescription: string;
  status: "draft" | "posted";
  wpPostId?: number;
  createdAt: string;
}

export interface GenerationConfig {
  clinicName: string;
  area: string;
  specialty: string;
  ownerName: string;
  phone: string;
  websiteUrl: string;
  bookingUrl: string;
  anthropicKey: string;
}

export interface PageAnalysis {
  id: string;
  url: string;
  symptom: string;
  scannedAt: string;
  // Structure
  h1: string;
  h2List: string[];
  h3List: string[];
  wordCount: number;
  imageCount: number;
  // Content checks
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
  hasReasons: boolean; // 選ばれる理由
  hasSymptomExplanation: boolean;
  // Scores (0-100)
  overallScore: number;
  structureScore: number;
  contentScore: number;
  ctaScore: number;
  seoScore: number;
  // Issues & suggestions
  issues: string[];
  suggestions: string[];
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  // Section order and structure
  sections: TemplateSection[];
  // SEO template
  titleTemplate: string; // e.g. "{area}{symptom}なら{clinicName}"
  metaTemplate: string;
  // Common HTML parts to insert
  partIds: string[]; // ContentPart IDs to include
  createdAt: string;
}

export interface TemplateSection {
  id: string;
  name: string;
  type: "h2-section" | "testimonials" | "cta" | "faq" | "access" | "profile" | "treatment-flow" | "reasons" | "custom-html";
  required: boolean;
  prompt: string; // AI prompt for this section
  fixedHtml?: string; // Fixed HTML (for CTA, access, etc.)
}

export type TabType = "symptoms" | "parts" | "scan" | "template" | "wp-drafts" | "blog" | "settings";
