import { WPConnection, SymptomPage, ContentPart, BlogDraft, GenerationConfig } from "./types";

const KEYS = {
  wp: "hp-content-wp",
  symptoms: "hp-content-symptoms",
  parts: "hp-content-parts",
  blogs: "hp-content-blogs",
  config: "hp-content-config",
  symptomList: "hp-content-symptom-list",
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

const DEFAULT_SYMPTOMS = [
  "腰痛", "肩こり", "頭痛", "坐骨神経痛", "ヘルニア", "脊柱管狭窄症",
  "膝痛", "股関節痛", "五十肩", "首の痛み", "背中の痛み", "骨盤矯正",
  "自律神経失調症", "めまい", "耳鳴り", "不眠", "手のしびれ", "足のしびれ",
  "ぎっくり腰", "産後の骨盤矯正", "猫背矯正", "側弯症", "顎関節症",
  "テニス肘", "腱鞘炎", "ストレートネック", "むち打ち",
];

export function getSymptomList(): string[] { return get(KEYS.symptomList, DEFAULT_SYMPTOMS); }
export function saveSymptomList(list: string[]) { set(KEYS.symptomList, list); }
