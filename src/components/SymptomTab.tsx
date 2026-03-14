"use client";

import { useState, useEffect, useCallback } from "react";
import { SymptomPage, GenerationConfig, WPConnection, ContentPart } from "@/lib/types";
import { getSymptomList, saveSymptomList } from "@/lib/storage";

interface Props {
  pages: SymptomPage[];
  parts: ContentPart[];
  config: GenerationConfig;
  wp: WPConnection | null;
  onUpdate: (pages: SymptomPage[]) => void;
}

export default function SymptomTab({ pages, parts, config, wp, onUpdate }: Props) {
  const [symptomList, setSymptomList] = useState<string[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, name: "" });
  const [posting, setPosting] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parts selection for generation
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);

  // Preview/edit modal
  const [editingPage, setEditingPage] = useState<SymptomPage | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMeta, setEditMeta] = useState("");
  const [editContent, setEditContent] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // Symptom list editor
  const [showSymptomEditor, setShowSymptomEditor] = useState(false);
  const [newSymptomInput, setNewSymptomInput] = useState("");

  useEffect(() => {
    setSymptomList(getSymptomList());
  }, []);

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  }, []);

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const togglePart = (id: string) => {
    setSelectedPartIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const addCustom = () => {
    if (customSymptom.trim() && !selectedSymptoms.includes(customSymptom.trim())) {
      setSelectedSymptoms([...selectedSymptoms, customSymptom.trim()]);
      setCustomSymptom("");
    }
  };

  // Symptom list management
  const addToSymptomList = () => {
    const s = newSymptomInput.trim();
    if (s && !symptomList.includes(s)) {
      const updated = [...symptomList, s];
      setSymptomList(updated);
      saveSymptomList(updated);
      setNewSymptomInput("");
    }
  };

  const removeFromSymptomList = (s: string) => {
    const updated = symptomList.filter((x) => x !== s);
    setSymptomList(updated);
    saveSymptomList(updated);
  };

  const handleBulkGenerate = async () => {
    if (selectedSymptoms.length === 0 || !config.anthropicKey) return;
    setGenerating(true);
    setProgress({ current: 0, total: selectedSymptoms.length, name: "" });
    setErrorMsg(null);

    const newPages = [...pages];
    const selectedParts = parts.filter((p) => selectedPartIds.includes(p.id));
    const partsPayload = selectedParts.length > 0
      ? selectedParts.map((p) => ({ type: p.type, name: p.name, html: p.html }))
      : undefined;

    const errors: string[] = [];

    for (let i = 0; i < selectedSymptoms.length; i++) {
      const symptom = selectedSymptoms[i];
      setProgress({ current: i + 1, total: selectedSymptoms.length, name: symptom });

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
            parts: partsPayload,
          }),
        });
        const data = await res.json();
        if (data.error) {
          errors.push(`${symptom}: ${data.error}`);
        } else if (data.result) {
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
      } catch (e) {
        const msg = e instanceof Error ? e.message : "通信エラー";
        errors.push(`${symptom}: ${msg}`);
      }
    }

    onUpdate(newPages);
    setGenerating(false);
    setSelectedSymptoms([]);

    if (errors.length > 0) {
      showError(`一部の生成に失敗しました:\n${errors.join("\n")}`);
    }
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
      } else {
        showError(`WP投稿エラー: ${data.error || "不明なエラー"}`);
      }
    } catch (e) {
      showError(`WP投稿エラー: ${e instanceof Error ? e.message : "通信に失敗しました"}`);
    }
    setPosting(null);
  };

  const handleDelete = (id: string) => {
    onUpdate(pages.filter((p) => p.id !== id));
  };

  // Preview/edit handlers
  const openEditor = (page: SymptomPage) => {
    setEditingPage(page);
    setEditTitle(page.title);
    setEditMeta(page.metaDescription);
    setEditContent(page.content);
    setCopySuccess(false);
  };

  const handleSavePage = () => {
    if (!editingPage) return;
    const updated = pages.map((p) =>
      p.id === editingPage.id ? { ...p, title: editTitle, metaDescription: editMeta, content: editContent } : p
    );
    onUpdate(updated);
    setEditingPage(null);
  };

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(editContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (e) {
      showError(`コピーに失敗しました: ${e instanceof Error ? e.message : "不明なエラー"}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error toast */}
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 max-w-md p-4 bg-red-50 border border-red-200 rounded-xl shadow-lg">
          <div className="flex items-start gap-2">
            <span className="text-red-500 text-sm font-medium flex-shrink-0">Error</span>
            <p className="text-sm text-red-700 whitespace-pre-wrap">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600 flex-shrink-0 ml-2">x</button>
          </div>
        </div>
      )}

      {/* Symptom list editor modal */}
      {showSymptomEditor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-lg">症状リスト編集</h3>
              <button onClick={() => setShowSymptomEditor(false)} className="text-gray-400 hover:text-gray-600 text-xl">x</button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newSymptomInput}
                  onChange={(e) => setNewSymptomInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addToSymptomList()}
                  placeholder="新しい症状名を追加"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={addToSymptomList} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">追加</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {symptomList.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs">
                    {s}
                    <button onClick={() => removeFromSymptomList(s)} className="text-gray-400 hover:text-red-500 ml-1">x</button>
                  </span>
                ))}
              </div>
              {symptomList.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">症状リストが空です。上から追加してください。</p>
              )}
            </div>
            <div className="p-4 border-t">
              <button onClick={() => setShowSymptomEditor(false)} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview/Edit modal */}
      {editingPage && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-lg">{editingPage.symptom} - 編集/プレビュー</h3>
              <button onClick={() => setEditingPage(null)} className="text-gray-400 hover:text-gray-600 text-xl">x</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">タイトル</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">meta description</label>
                <input
                  type="text"
                  value={editMeta}
                  onChange={(e) => setEditMeta(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">HTMLコード</label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={20}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">プレビュー</label>
                  <div className="border border-gray-200 rounded-lg p-4 overflow-y-auto" style={{ height: "calc(20 * 1.5rem + 1rem)" }}>
                    <div dangerouslySetInnerHTML={{ __html: editContent }} className="prose prose-sm max-w-none" />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2">
              <button
                onClick={handleSavePage}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                保存
              </button>
              <button
                onClick={handleCopyHtml}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium ${
                  copySuccess ? "bg-green-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {copySuccess ? "コピーしました" : "HTMLをコピー"}
              </button>
              <button
                onClick={() => setEditingPage(null)}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Symptom selection */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 text-lg">症状別ページ一括作成</h3>
          <button
            onClick={() => setShowSymptomEditor(true)}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200"
          >
            症状リスト編集
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          作成したい症状を選択して「一括生成」を押すと、AIが各症状のページコンテンツを自動生成します
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {symptomList.map((s) => {
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
                {exists ? `${s} done` : s}
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

        {/* Parts selection */}
        {parts.length > 0 && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-700 mb-2">挿入するパーツを選択（任意）:</p>
            <div className="flex flex-wrap gap-2">
              {parts.map((part) => (
                <button
                  key={part.id}
                  onClick={() => togglePart(part.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedPartIds.includes(part.id)
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {part.name}
                </button>
              ))}
            </div>
            {selectedPartIds.length > 0 && (
              <p className="text-xs text-indigo-600 mt-2">{selectedPartIds.length}件のパーツを挿入予定</p>
            )}
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

      {/* Generated pages list */}
      {pages.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-3">生成済みページ ({pages.length}件)</h3>
          <div className="space-y-2">
            {pages.map((page) => (
              <div key={page.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="cursor-pointer flex-1 mr-4" onClick={() => openEditor(page)}>
                    <p className="font-medium text-gray-800">{page.symptom}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{page.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">/{page.slug}</p>
                    <p className="text-xs text-indigo-500 mt-1">クリックして編集/プレビュー</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEditor(page)}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs hover:bg-indigo-100"
                    >
                      編集
                    </button>
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
