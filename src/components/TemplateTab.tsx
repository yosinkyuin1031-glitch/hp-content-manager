"use client";

import { useState } from "react";
import { PageTemplate, TemplateSection, ContentPart, GenerationConfig, SymptomPage, WPConnection } from "@/lib/types";

// Default template based on analysis of oguchi-seitai-osaka.com best pages
const DEFAULT_SECTIONS: TemplateSection[] = [
  {
    id: "intro",
    name: "導入・共感セクション",
    type: "h2-section",
    required: true,
    prompt: "「{symptom}」でお悩みの方への共感メッセージ。こんなお悩みはありませんか？というチェックリスト形式で5-7項目。",
  },
  {
    id: "about-symptom",
    name: "症状の原因と説明",
    type: "h2-section",
    required: true,
    prompt: "「{symptom}」の原因、メカニズム、一般的な治療法と限界を専門的かつ分かりやすく説明。「{symptom}とは」「知っていますか？痛みの真実」のようなH2で構成。",
  },
  {
    id: "untreated",
    name: "放っておくと",
    type: "h2-section",
    required: true,
    prompt: "「{symptom}」を放置した場合のリスクを3-4点、具体的に説明。危機感を適度に持たせつつ、解決策への導線を作る。",
  },
  {
    id: "approach",
    name: "当院独自の施術アプローチ",
    type: "h2-section",
    required: true,
    prompt: "当院の神経整体による「{symptom}」へのアプローチを説明。骨・筋肉だけでなく神経まで見る独自の施術。痛くない施術であることを強調。",
  },
  {
    id: "reasons",
    name: "選ばれる5つの理由",
    type: "reasons",
    required: true,
    prompt: "大口神経整体院が選ばれる5つの理由：①神経まで見る検査 ②痛くない神経整体 ③その場で変化を実感 ④重症症状に特化 ⑤姿勢・歩き方・生活動作まで整える",
  },
  {
    id: "flow",
    name: "施術の流れ",
    type: "treatment-flow",
    required: true,
    prompt: "施術の流れ7ステップ：①問診表・カウンセリング ②根本原因の検査 ③現状説明 ④施術 ⑤施術後確認 ⑥セルフケア指導 ⑦会計・次回予約",
  },
  {
    id: "testimonials",
    name: "お客様の声",
    type: "testimonials",
    required: true,
    prompt: "「{symptom}」が改善されたお客様の声を3件。【{symptom}】で始まるタイトル形式。改善前の辛さ→来院のきっかけ→改善後の変化の流れ。",
  },
  {
    id: "faq",
    name: "よくある質問",
    type: "faq",
    required: true,
    prompt: "「{symptom}」に関するよくある質問を5件。施術回数、痛み、保険適用、通院頻度、他院との違いなど。",
  },
  {
    id: "profile",
    name: "院長からのメッセージ",
    type: "profile",
    required: true,
    prompt: "院長 {ownerName} からの「{symptom}」で悩む方へのメッセージ。共感と専門性、「最後の砦」としての決意。",
  },
  {
    id: "pricing",
    name: "料金案内",
    type: "h2-section",
    required: true,
    prompt: "根本改善プログラムの料金案内。初回3,980円（通常8,800円）。回数券の案内。",
  },
  {
    id: "access",
    name: "アクセス情報",
    type: "access",
    required: true,
    prompt: "店舗アクセス：大阪市住吉区長居東4丁目2-7、長居駅徒歩1分。駐車場あり。",
  },
  {
    id: "cta",
    name: "予約CTA",
    type: "cta",
    required: true,
    prompt: "電話（070-8498-2968）とLINE予約への導線。「ホームページを見ました」と伝えてください。",
  },
];

interface Props {
  templates: PageTemplate[];
  parts: ContentPart[];
  config: GenerationConfig;
  pages: SymptomPage[];
  wp: WPConnection | null;
  onUpdateTemplates: (t: PageTemplate[]) => void;
  onUpdatePages: (p: SymptomPage[]) => void;
}

export default function TemplateTab({ templates, parts, config, pages, wp, onUpdateTemplates, onUpdatePages }: Props) {
  const [editingTemplate, setEditingTemplate] = useState<PageTemplate | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, name: "" });
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [wpPublishStatus, setWpPublishStatus] = useState<"draft" | "publish">("draft");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bulkResults, setBulkResults] = useState<{ symptom: string; status: "success" | "error"; msg: string }[]>([]);

  // Get or create default template
  const activeTemplate = templates.length > 0 ? templates.find((t) => t.id === selectedTemplateId) || templates[0] : null;

  const createDefaultTemplate = () => {
    const template: PageTemplate = {
      id: `tpl-${Date.now()}`,
      name: "大口神経整体院 標準テンプレート",
      description: "既存サイト分析に基づく症状ページの理想構成",
      sections: DEFAULT_SECTIONS,
      titleTemplate: "{area}で{symptom}にお悩みなら{clinicName}",
      metaTemplate: "{area}で{symptom}の根本改善なら{clinicName}。神経整体で{symptom}の原因を見つけ出し、痛みのない施術で改善。初回3,980円。長居駅徒歩1分。",
      partIds: [],
      createdAt: new Date().toISOString(),
    };
    const updated = [...templates, template];
    onUpdateTemplates(updated);
    setSelectedTemplateId(template.id);
    setEditingTemplate(template);
  };

  const saveTemplate = (template: PageTemplate) => {
    const updated = templates.map((t) => (t.id === template.id ? template : t));
    if (!templates.find((t) => t.id === template.id)) updated.push(template);
    onUpdateTemplates(updated);
    setEditingTemplate(null);
  };

  const deleteTemplate = (id: string) => {
    onUpdateTemplates(templates.filter((t) => t.id !== id));
    if (selectedTemplateId === id) setSelectedTemplateId("");
  };

  // Symptoms to generate
  const ALL_SYMPTOMS = [
    "脊柱管狭窄症", "腰痛", "ぎっくり腰", "椎間板ヘルニア", "腰椎分離症", "腰椎すべり症",
    "坐骨神経痛", "梨状筋症候群", "仙腸関節炎", "変形性股関節症", "股関節痛",
    "膝痛", "変形性膝関節症", "自律神経失調症",
    "肩こり", "頭痛", "五十肩", "首の痛み", "背中の痛み",
    "手のしびれ", "足のしびれ", "めまい", "耳鳴り", "不眠",
    "産後の骨盤矯正", "猫背矯正", "側弯症", "顎関節症",
    "テニス肘", "腱鞘炎", "ストレートネック", "むち打ち",
  ];

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const selectAll = () => {
    const ungenerated = ALL_SYMPTOMS.filter((s) => !pages.find((p) => p.symptom === s));
    setSelectedSymptoms(ungenerated);
  };

  // Bulk generate using template
  const handleBulkGenerate = async () => {
    if (!activeTemplate || selectedSymptoms.length === 0 || !config.anthropicKey) return;
    setGenerating(true);
    setBulkResults([]);
    setErrorMsg(null);

    const newPages = [...pages];
    const results: { symptom: string; status: "success" | "error"; msg: string }[] = [];

    for (let i = 0; i < selectedSymptoms.length; i++) {
      const symptom = selectedSymptoms[i];
      setProgress({ current: i + 1, total: selectedSymptoms.length, name: symptom });

      if (newPages.find((p) => p.symptom === symptom)) {
        results.push({ symptom, status: "success", msg: "既に生成済み" });
        continue;
      }

      try {
        const res = await fetch("/api/generate-from-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symptom,
            template: activeTemplate,
            config,
            parts: parts.filter((p) => activeTemplate.partIds.includes(p.id)),
          }),
        });
        const data = await res.json();

        if (data.error) {
          results.push({ symptom, status: "error", msg: data.error });
          continue;
        }

        const page: SymptomPage = {
          id: `sp-${Date.now()}-${i}`,
          symptom,
          slug: data.result.slug,
          title: data.result.title,
          metaDescription: data.result.metaDescription,
          h1: data.result.h1,
          content: data.result.content,
          status: "generated",
          createdAt: new Date().toISOString(),
        };

        // Auto-post to WP if connection available
        if (wp) {
          try {
            const wpRes = await fetch("/api/wp-post", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                siteUrl: wp.siteUrl,
                username: wp.username,
                appPassword: wp.appPassword,
                title: page.title,
                content: page.content,
                slug: page.slug,
                status: wpPublishStatus,
                metaDescription: page.metaDescription,
              }),
            });
            const wpData = await wpRes.json();
            if (wpData.success) {
              page.status = "posted";
              page.wpPostId = wpData.postId;
              page.wpUrl = wpData.postUrl;
              results.push({ symptom, status: "success", msg: `WP投稿完了 (${wpPublishStatus})` });
            } else {
              results.push({ symptom, status: "success", msg: `生成OK / WP投稿失敗: ${wpData.error}` });
            }
          } catch {
            results.push({ symptom, status: "success", msg: "生成OK / WP投稿通信エラー" });
          }
        } else {
          results.push({ symptom, status: "success", msg: "生成完了" });
        }

        newPages.push(page);
      } catch (e) {
        results.push({ symptom, status: "error", msg: e instanceof Error ? e.message : "通信エラー" });
      }
    }

    onUpdatePages(newPages);
    setBulkResults(results);
    setGenerating(false);
    setSelectedSymptoms([]);
  };

  return (
    <div className="space-y-6">
      {/* Error toast */}
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 max-w-md p-4 bg-red-50 border border-red-200 rounded-xl shadow-lg">
          <p className="text-sm text-red-700">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="absolute top-2 right-3 text-red-400">x</button>
        </div>
      )}

      {/* Template editor modal */}
      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          parts={parts}
          onSave={saveTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}

      {/* Template management */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">テンプレート管理</h3>
            <p className="text-xs text-gray-500 mt-1">既存サイトの分析結果を基に、理想的なページ構成を定義します</p>
          </div>
          <button
            onClick={createDefaultTemplate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            標準テンプレート作成
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-sm mb-3">テンプレートがありません</p>
            <p className="text-xs text-gray-400">「標準テンプレート作成」ボタンで、既存サイト分析に基づくテンプレートを作成できます</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                  selectedTemplateId === tpl.id ? "border-indigo-500 bg-indigo-50" : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                }`}
                onClick={() => setSelectedTemplateId(tpl.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{tpl.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{tpl.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{tpl.sections.length}セクション / SEOテンプレ設定済み</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingTemplate(tpl); }}
                      className="px-3 py-1.5 bg-white text-indigo-600 rounded-lg text-xs hover:bg-indigo-100 border border-indigo-200"
                    >
                      編集
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteTemplate(tpl.id); }}
                      className="px-3 py-1.5 bg-white text-red-600 rounded-lg text-xs hover:bg-red-50 border border-red-200"
                    >
                      削除
                    </button>
                  </div>
                </div>
                {selectedTemplateId === tpl.id && (
                  <div className="mt-3 pt-3 border-t border-indigo-200">
                    <p className="text-xs font-medium text-indigo-700 mb-2">セクション構成:</p>
                    <div className="flex flex-wrap gap-1">
                      {tpl.sections.map((s, i) => (
                        <span key={s.id} className="text-[10px] bg-white text-indigo-600 px-2 py-0.5 rounded border border-indigo-200">
                          {i + 1}. {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk generation */}
      {activeTemplate && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-lg mb-2">一括生成</h3>
          <p className="text-xs text-gray-500 mb-4">
            テンプレート「{activeTemplate.name}」を使って、選択した症状のページを一括生成します
          </p>

          {/* WP publish option */}
          {wp && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center gap-3">
              <span className="text-xs text-blue-700 font-medium">WP自動投稿:</span>
              <select
                value={wpPublishStatus}
                onChange={(e) => setWpPublishStatus(e.target.value as "draft" | "publish")}
                className="text-xs px-2 py-1 border border-blue-200 rounded bg-white text-blue-700"
              >
                <option value="draft">下書きとして保存</option>
                <option value="publish">公開する</option>
              </select>
              <span className="text-[10px] text-blue-500">生成後に自動でWordPressに投稿されます</span>
            </div>
          )}

          {/* Symptom selection */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600">生成する症状を選択:</p>
              <button onClick={selectAll} className="text-xs text-indigo-600 hover:text-indigo-800">未生成をすべて選択</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SYMPTOMS.map((s) => {
                const exists = pages.find((p) => p.symptom === s);
                return (
                  <button
                    key={s}
                    onClick={() => !exists && toggleSymptom(s)}
                    disabled={!!exists}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      exists
                        ? "bg-green-100 text-green-600 cursor-default"
                        : selectedSymptoms.includes(s)
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {exists ? `${s} (済)` : s}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedSymptoms.length > 0 && (
            <div className="mb-3 p-3 bg-indigo-50 rounded-lg">
              <p className="text-xs text-indigo-700 font-medium">
                選択中: {selectedSymptoms.length}件
                {wp && ` → 生成後にWPに${wpPublishStatus === "draft" ? "下書き" : "公開"}投稿`}
              </p>
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
            {generating
              ? `生成中 (${progress.current}/${progress.total})...`
              : `${selectedSymptoms.length}件を一括生成${wp ? " → WP投稿" : ""}`}
          </button>

          {!config.anthropicKey && (
            <p className="text-xs text-red-500 mt-2">設定タブでAPIキーを入力してください</p>
          )}
        </div>
      )}

      {/* Results */}
      {bulkResults.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-lg mb-3">生成結果</h3>
          <div className="space-y-1">
            {bulkResults.map((r, i) => (
              <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs ${
                r.status === "success" ? "bg-green-50" : "bg-red-50"
              }`}>
                <span className={r.status === "success" ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                  {r.status === "success" ? "OK" : "NG"}
                </span>
                <span className="font-medium text-gray-700">{r.symptom}</span>
                <span className={r.status === "success" ? "text-green-600" : "text-red-600"}>{r.msg}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t text-xs text-gray-500">
            成功: {bulkResults.filter((r) => r.status === "success").length}件 /
            失敗: {bulkResults.filter((r) => r.status === "error").length}件
          </div>
        </div>
      )}

      {/* Generated pages summary */}
      {pages.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-lg mb-3">生成済みページ ({pages.length}件)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {pages.map((page) => (
              <div key={page.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-800 text-sm">{page.symptom}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">/{page.slug}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    page.status === "posted" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {page.status === "posted" ? "WP投稿済" : "生成済"}
                  </span>
                  {page.wpUrl && (
                    <a href={page.wpUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline">
                      開く
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Template Editor Component
function TemplateEditor({ template, parts, onSave, onClose }: {
  template: PageTemplate;
  parts: ContentPart[];
  onSave: (t: PageTemplate) => void;
  onClose: () => void;
}) {
  const [t, setT] = useState<PageTemplate>({ ...template, sections: template.sections.map((s) => ({ ...s })) });

  const updateSection = (idx: number, updates: Partial<TemplateSection>) => {
    const sections = [...t.sections];
    sections[idx] = { ...sections[idx], ...updates };
    setT({ ...t, sections });
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const sections = [...t.sections];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sections.length) return;
    [sections[idx], sections[newIdx]] = [sections[newIdx], sections[idx]];
    setT({ ...t, sections });
  };

  const removeSection = (idx: number) => {
    setT({ ...t, sections: t.sections.filter((_, i) => i !== idx) });
  };

  const addSection = () => {
    const section: TemplateSection = {
      id: `sec-${Date.now()}`,
      name: "新しいセクション",
      type: "h2-section",
      required: false,
      prompt: "",
    };
    setT({ ...t, sections: [...t.sections, section] });
  };

  const togglePart = (partId: string) => {
    const partIds = t.partIds.includes(partId)
      ? t.partIds.filter((id) => id !== partId)
      : [...t.partIds, partId];
    setT({ ...t, partIds });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-lg">テンプレート編集</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">x</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Basic info */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">テンプレート名</label>
              <input type="text" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">タイトルテンプレ（{"{area}"}, {"{symptom}"}, {"{clinicName}"}が使用可能）</label>
              <input type="text" value={t.titleTemplate} onChange={(e) => setT({ ...t, titleTemplate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">meta descriptionテンプレ</label>
              <textarea value={t.metaTemplate} onChange={(e) => setT({ ...t, metaTemplate: e.target.value })} rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>
          </div>

          {/* Parts selection */}
          {parts.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">挿入するパーツ</label>
              <div className="flex flex-wrap gap-2">
                {parts.map((p) => (
                  <button key={p.id} onClick={() => togglePart(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      t.partIds.includes(p.id) ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sections */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">セクション構成（上から順に配置）</label>
              <button onClick={addSection} className="text-xs text-indigo-600 hover:text-indigo-800">+ セクション追加</button>
            </div>
            <div className="space-y-2">
              {t.sections.map((sec, idx) => (
                <div key={sec.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400 w-5">{idx + 1}.</span>
                    <input type="text" value={sec.name} onChange={(e) => updateSection(idx, { name: e.target.value })}
                      className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
                    <select value={sec.type} onChange={(e) => updateSection(idx, { type: e.target.value as TemplateSection["type"] })}
                      className="text-xs px-2 py-1 border border-gray-200 rounded bg-white">
                      <option value="h2-section">H2セクション</option>
                      <option value="testimonials">お客様の声</option>
                      <option value="faq">FAQ</option>
                      <option value="cta">CTA</option>
                      <option value="access">アクセス</option>
                      <option value="profile">院長プロフィール</option>
                      <option value="treatment-flow">施術の流れ</option>
                      <option value="reasons">選ばれる理由</option>
                      <option value="custom-html">カスタムHTML</option>
                    </select>
                    <button onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs px-1">↑</button>
                    <button onClick={() => moveSection(idx, 1)} disabled={idx === t.sections.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs px-1">↓</button>
                    <button onClick={() => removeSection(idx)} className="text-red-400 hover:text-red-600 text-xs px-1">x</button>
                  </div>
                  <textarea
                    value={sec.prompt}
                    onChange={(e) => updateSection(idx, { prompt: e.target.value })}
                    rows={2}
                    placeholder="AIへの指示（{symptom}, {clinicName}, {area}等を使用可能）"
                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex gap-2">
          <button onClick={() => onSave(t)} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            保存
          </button>
          <button onClick={onClose} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
