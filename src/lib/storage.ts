import { WPConnection, SymptomPage, ContentPart, BlogDraft, GenerationConfig } from "./types";

const KEYS = {
  wp: "hp-content-wp",
  symptoms: "hp-content-symptoms",
  parts: "hp-content-parts",
  blogs: "hp-content-blogs",
  config: "hp-content-config",
};

function get<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}
function set<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getWP(): WPConnection | null { return get(KEYS.wp, null); }
export function saveWP(wp: WPConnection) { set(KEYS.wp, wp); }

export function getSymptomPages(): SymptomPage[] { return get(KEYS.symptoms, []); }
export function saveSymptomPages(data: SymptomPage[]) { set(KEYS.symptoms, data); }

export function getParts(): ContentPart[] { return get(KEYS.parts, []); }
export function saveParts(data: ContentPart[]) { set(KEYS.parts, data); }

export function getBlogs(): BlogDraft[] { return get(KEYS.blogs, []); }
export function saveBlogs(data: BlogDraft[]) { set(KEYS.blogs, data); }

export function getConfig(): GenerationConfig {
  return get(KEYS.config, {
    clinicName: "", area: "", specialty: "", ownerName: "", phone: "", websiteUrl: "", bookingUrl: "", anthropicKey: "",
  });
}
export function saveConfig(config: GenerationConfig) { set(KEYS.config, config); }
