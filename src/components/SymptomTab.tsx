"use client";

import { useState } from "react";
import { SymptomPage, GenerationConfig, WPConnection } from "@/lib/types";

interface Props {
  pages: SymptomPage[];
  config: GenerationConfig;
  wp: WPConnection | null;
  onUpdate: (pages: SymptomPage[]) => void;
}

const COMMON_SYMPTOMS = [
  "腰痛", "肩こり", "頭痛", "坐骨神経痛", "ヘルニア", "脊柱管狭窄症",
  "膝痛", "股関節痛", "五十肩", "首の痛み", "背中の痛み", "骨盤矯正",
  "自律神経失調症", "めまい", "耳鳴り", "不眠", "手のしびれ", "足のしびれ",
  "ぎっくり腰", "産後の骨盤矯正", "猫背矯正", "側弯症", "顎関節症",
  "テニス肘", "腱鞘炎", "ストレートネック", "むち打ち",
];

export default function SymptomTab({ pages, config, wp, onUpdate }: Props) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, name: "" });
  const [posting, setPosting] = useState<string | null>(null);

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const addCustom = () => {
    if (customSymptom.trim() && !selectedSymptoms.includes(customSymptom.trim())) {
      setSelectedSymptoms([...selectedSymptoms, customSymptom.trim()]);
      setCustomSymptom("");
    }
  };

  const handleBulkGenerate = async () => {
    if (selectedSymptoms.length === 0 || !config.anthropicKey) return;
    setGenerating(true);
    setProgress({ current: 0, total: selectedSymptoms.length, name: "" });

    const newPages = [...pages];

    for (let i = 0; i < selectedSymptoms.length; i++) {
      const symptom = selectedSymptoms[i];
      setProgress({ current: i + 1, total: selectedSymptoms.length, name: symptom });

      // 既存チェック
      if (newPages.find((p) => p.symptom === symptom)) continue;

      try {
        const res = await fetch("/api/generate-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symptom,
            clinicName: config.clinicName,
            area: config.area,
            specialty: config.specialty,
            ownerName: config.ownerName,
            bookingUrl: config.bookingUrl,
            apiKey: config.anthropicKey,
          }),
        });
        const data = await res.json();
        if (data.result) {
          newPages.push({
            id: `sp-${Date.now()}-${i}`,
            symptom,
            slug: data.result.slug || symptom.toLowerCase(),
            title: data.result.title,
            metaDescription: data.result.metaDescription,
            h1: data.result.h1,
            content: data.result.content,
            status: "generated",
            createdAt: new Date().toISOString(),
          });
        }
      } catch { /* continue */ }
    }

    onUpdate(newPages);
    setGenerating(false);
    setSelectedSymptoms([]);
  };

  const handlePostToWP = async (page: SymptomPage) => {
    if (!wp) return;
    setPosting(page.id);
    try {
      const res = await fetch("/api/wp-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl: wp.siteUrl,
          username: wp.username,
          appPassword: wp.appPassword,
          title: page.title,
          content: page.content,
          slug: page.slug,
          status: "draft",
          metaDescription: page.metaDescription,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = pages.map((p) =>
          p.id === page.id ? { ...p, status: "posted" as const, wpPostId: data.postId, wpUrl: data.postUrl } : p
        );
        onUpdate(updated);
      }
    } catch { /* ignore */ }
    setPosting(null);
  };

  const handleDelete = (id: string) => {
    onUpdate(pages.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* 症状選択 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-lg mb-3">症状別ページ一括作成</h3>
        <p className="text-xs text-gray-500 mb-4">
          作成したい症状を選択して「一括生成」を押すと、AIが各症状のページコンテンツを自動生成します
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {COMMON_SYMPTOMS.map((s) => {
            const exists = pages.find((p) => p.symptom === s);
            return (
              <button
                key={s}
                onClick={() => !exists && toggleSymptom(s)}
                disabled={!!exists}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  exists ? "bg-green-100 text-green-600 cursor-default"
                  : selectedSymptoms.includes(s) ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {exists ? `${s} ✓` : s}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={customSymptom}
            onChange={(e) => setCustomSymptom(e.target.value)}
            placeholder="カスタム症状名を追加"
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button onClick={addCustom} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">追加</button>
        </div>

        {selectedSymptoms.length > 0 && (
          <div className="mb-3 p-3 bg-indigo-50 rounded-lg">
            <p className="text-xs text-indigo-700 font-medium">選択中: {selectedSymptoms.join(", ")} ({selectedSymptoms.length}件)</p>
          </div>
        )}

        {generating && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>{progress.name}を生成中...</span>
              <span>{progress.current}/{progress.total}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
            </div>
          </div>
        )}

        <button
          onClick={handleBulkGenerate}
          disabled={generating || selectedSymptoms.length === 0 || !config.anthropicKey}
          className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300"
        >
          {generating ? `生成中 (${progress.current}/${progress.total})...` : `${selectedSymptoms.length}件のページを一括生成`}
        </button>

        {!config.anthropicKey && (
          <p className="text-xs text-red-500 mt-2">設定タブでAPIキーを入力してください</p>
        )}
      </div>

      {/* 生成済みページ一覧 */}
      {pages.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-3">生成済みページ ({pages.length}件)</h3>
          <div className="space-y-2">
            {pages.map((page) => (
              <div key={page.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{page.symptom}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{page.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">/{page.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    {page.status === "posted" ? (
                      <a href={page.wpUrl} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs">
                        WP投稿済み
                      </a>
                    ) : wp ? (
                      <button
                        onClick={() => handlePostToWP(page)}
                        disabled={posting === page.id}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 disabled:opacity-50"
                      >
                        {posting === page.id ? "投稿中..." : "WPに投稿"}
                      </button>
                    ) : null}
                    <button onClick={() => handleDelete(page.id)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100">
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
