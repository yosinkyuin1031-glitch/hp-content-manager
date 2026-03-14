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

export type TabType = "symptoms" | "parts" | "blog" | "settings";
