"use client";

import { useState, useEffect } from "react";
import { TabType, SymptomPage, ContentPart, GenerationConfig, WPConnection } from "@/lib/types";
import { getSymptomPages, saveSymptomPages, getParts, saveParts, getConfig, saveConfig, getWP, saveWP } from "@/lib/storage";
import SymptomTab from "@/components/SymptomTab";
import PartsTab from "@/components/PartsTab";

export default function Home() {
  const [tab, setTab] = useState<TabType>("symptoms");
  const [pages, setPages] = useState<SymptomPage[]>([]);
  const [parts, setParts] = useState<ContentPart[]>([]);
  const [config, setConfig] = useState<GenerationConfig>(getConfig());
  const [wp, setWp] = useState<WPConnection | null>(null);

  useEffect(() => {
    setPages(getSymptomPages());
    setParts(getParts());
    setConfig(getConfig());
    setWp(getWP());
  }, []);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "symptoms", label: "症状ページ", icon: "📄" },
    { id: "parts", label: "パーツ管理", icon: "🧩" },
    { id: "settings", label: "設定", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-800">
            <span className="text-indigo-600">HP</span>コンテンツ管理
            <span className="text-xs text-gray-400 ml-2">症状別ページ一括作成</span>
          </h1>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 sticky top-[52px] z-10">
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {tab === "symptoms" && (
          <SymptomTab
            pages={pages}
            parts={parts}
            config={config}
            wp={wp}
            onUpdate={(p) => { saveSymptomPages(p); setPages(p); }}
          />
        )}
        {tab === "parts" && (
          <PartsTab parts={parts} onUpdate={(p) => { saveParts(p); setParts(p); }} />
        )}
        {tab === "settings" && (
          <SettingsView config={config} wp={wp}
            onSaveConfig={(c) => { saveConfig(c); setConfig(c); }}
            onSaveWP={(w) => { saveWP(w); setWp(w); }}
          />
        )}
      </main>
    </div>
  );
}

function SettingsView({ config, wp, onSaveConfig, onSaveWP }: {
  config: GenerationConfig; wp: WPConnection | null;
  onSaveConfig: (c: GenerationConfig) => void; onSaveWP: (w: WPConnection) => void;
}) {
  const [c, setC] = useState(config);
  const [w, setW] = useState<WPConnection>(wp || { siteUrl: "", username: "", appPassword: "" });
  const [saved, setSaved] = useState(false);
  const [wpTest, setWpTest] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const save = () => {
    onSaveConfig(c);
    if (w.siteUrl && w.username && w.appPassword) onSaveWP(w);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testWP = async () => {
    const res = await fetch("/api/wp-post", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(w),
    });
    const data = await res.json();
    setWpTest(res.ok ? { type: "success", msg: `接続OK: ${data.userName}` } : { type: "error", msg: data.error });
  };

  const field = (label: string, key: keyof GenerationConfig, placeholder: string) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={key === "anthropicKey" ? "password" : "text"} value={c[key]} onChange={(e) => setC({ ...c, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-800 text-lg">院情報設定</h3>
        <div className="grid grid-cols-2 gap-3">
          {field("院名", "clinicName", "大口神経整体院")}
          {field("エリア", "area", "大阪市住吉区長居")}
          {field("専門分野", "specialty", "重症な慢性痛・神経痛")}
          {field("院長名", "ownerName", "大口陽平")}
        </div>
        {field("電話番号", "phone", "06-1234-5678")}
        {field("ホームページURL", "websiteUrl", "https://your-clinic.com")}
        {field("予約URL", "bookingUrl", "https://your-clinic.com/booking")}
        <div className="pt-2 border-t">
          {field("Anthropic APIキー", "anthropicKey", "sk-ant-...")}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-3">
        <h3 className="font-bold text-gray-800 text-lg">WordPress連携</h3>
        <input type="url" value={w.siteUrl} onChange={(e) => setW({ ...w, siteUrl: e.target.value })}
          placeholder="サイトURL" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
        <div className="grid grid-cols-2 gap-2">
          <input type="text" value={w.username} onChange={(e) => setW({ ...w, username: e.target.value })}
            placeholder="ユーザー名" className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          <input type="password" value={w.appPassword} onChange={(e) => setW({ ...w, appPassword: e.target.value })}
            placeholder="アプリパスワード" className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <button onClick={testWP} className="w-full py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200">接続テスト</button>
        {wpTest && <p className={`text-xs px-3 py-2 rounded-lg ${wpTest.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{wpTest.msg}</p>}
      </div>

      <button onClick={save}
        className={`w-full py-2.5 rounded-lg text-sm font-medium ${saved ? "bg-green-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
        {saved ? "保存しました" : "設定を保存"}
      </button>
    </div>
  );
}
