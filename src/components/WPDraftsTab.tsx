"use client";

import { useState, useCallback } from "react";
import { WPConnection, GenerationConfig, ContentPart } from "@/lib/types";

interface WPPage {
  id: number;
  title: string;
  slug: string;
  status: string;
  content: string;
  excerpt: string;
  date: string;
  modified: string;
  link: string;
}

interface Props {
  wp: WPConnection | null;
  config: GenerationConfig;
  parts: ContentPart[];
}

export default function WPDraftsTab({ wp, config, parts }: Props) {
  const [pages, setPages] = useState<WPPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pluginNeeded, setPluginNeeded] = useState(false);

  // Edit modal
  const [editingPage, setEditingPage] = useState<WPPage | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // AI improve
  const [improving, setImproving] = useState(false);
  const [improveTarget, setImproveTarget] = useState<number | null>(null);

  // Analysis view
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<{ pageId: number; issues: string[]; suggestions: string[]; wordCount: number; hasH2: boolean; sectionCount: number } | null>(null);

  const fetchDrafts = useCallback(async () => {
    if (!wp) return;
    setLoading(true);
    setError(null);
    setPluginNeeded(false);

    try {
      const params = new URLSearchParams({
        siteUrl: wp.siteUrl,
        username: wp.username,
        appPassword: wp.appPassword,
        postType: "symptomscat",
        perPage: "100",
      });

      const res = await fetch(`/api/wp-drafts?${params}`);
      const data = await res.json();

      if (data.error === "REST_NOT_AVAILABLE") {
        setPluginNeeded(true);
        setError(data.message);
      } else if (data.error === "AUTH_FAILED") {
        setError("WordPress認証エラー: 設定タブでユーザー名とアプリパスワードを確認してください");
      } else if (data.error) {
        setError(data.message || data.error);
      } else {
        setPages(data.pages || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "通信エラー");
    }
    setLoading(false);
  }, [wp]);

  const openEditor = (page: WPPage) => {
    setEditingPage(page);
    setEditTitle(page.title);
    setEditContent(page.content);
    setSaveMsg(null);
  };

  const savePage = async (newStatus?: string) => {
    if (!editingPage || !wp) return;
    setSaving(true);
    setSaveMsg(null);

    const updates: Record<string, string> = {
      content: editContent,
      title: editTitle,
    };
    if (newStatus) updates.status = newStatus;

    try {
      const res = await fetch("/api/wp-drafts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl: wp.siteUrl,
          username: wp.username,
          appPassword: wp.appPassword,
          postId: editingPage.id,
          postType: "symptomscat",
          updates,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMsg(`保存完了${newStatus === "publish" ? "（公開しました）" : ""}`);
        // Update local state
        setPages((prev) =>
          prev.map((p) =>
            p.id === editingPage.id
              ? { ...p, title: editTitle, content: editContent, status: newStatus || p.status }
              : p
          )
        );
        setEditingPage({ ...editingPage, title: editTitle, content: editContent, status: newStatus || editingPage.status });
      } else {
        setSaveMsg(`エラー: ${data.error}`);
      }
    } catch (e) {
      setSaveMsg(`エラー: ${e instanceof Error ? e.message : "通信エラー"}`);
    }
    setSaving(false);
  };

  // Quick analysis of a page's content
  const analyzePage = (page: WPPage) => {
    const content = page.content;
    const text = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const wordCount = text.length;

    const h2Match = content.match(/<h2[^>]*>/gi);
    const h2Count = h2Match ? h2Match.length : 0;

    const issues: string[] = [];
    const suggestions: string[] = [];

    if (wordCount < 1000) {
      issues.push(`文字数が${wordCount}文字しかありません（推奨5,000文字以上）`);
      suggestions.push("症状の原因・メカニズムの説明を追加しましょう");
    } else if (wordCount < 3000) {
      issues.push(`文字数が${wordCount}文字です（推奨5,000文字以上）`);
    }

    if (h2Count < 3) {
      issues.push(`H2見出しが${h2Count}個しかありません`);
      suggestions.push("セクション構成を充実させましょう");
    }

    if (!/選ばれる|理由/.test(content)) suggestions.push("「選ばれる理由」セクションを追加しましょう");
    if (!/施術の流れ|ステップ/.test(content)) suggestions.push("「施術の流れ」セクションを追加しましょう");
    if (!/お客様の声|患者様の声|喜びの声/.test(content)) suggestions.push("「お客様の声」セクションを追加しましょう");
    if (!/FAQ|よくある質問/.test(content)) suggestions.push("「よくある質問」セクションを追加しましょう");
    if (!/院長|メッセージ/.test(content)) suggestions.push("「院長メッセージ」セクションを追加しましょう");
    if (!/アクセス|住所/.test(content)) suggestions.push("「アクセス情報」セクションを追加しましょう");
    if (!/070-8498-2968|tel:/.test(content)) suggestions.push("電話番号CTAを追加しましょう");
    if (!/LINE|line/.test(content)) suggestions.push("LINE予約CTAを追加しましょう");

    setAnalysis({ pageId: page.id, issues, suggestions, wordCount, hasH2: h2Count >= 3, sectionCount: h2Count });
    setAnalyzing(page.id);
  };

  // AI-powered content improvement
  const handleImprove = async (page: WPPage) => {
    if (!config.anthropicKey) {
      setError("設定タブでAPIキーを入力してください");
      return;
    }
    setImproving(true);
    setImproveTarget(page.id);

    // Build parts to insert
    const partsToInsert = parts.map((p) => `【${p.name}】\n${p.html}`).join("\n\n---\n\n");

    try {
      const res = await fetch("/api/improve-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentContent: page.content,
          title: page.title,
          config,
          parts: partsToInsert,
        }),
      });
      const data = await res.json();
      if (data.result) {
        // Open in editor with improved content
        setEditingPage(page);
        setEditTitle(page.title);
        setEditContent(data.result);
        setSaveMsg("AIが改善したコンテンツです。確認してから保存してください。");
      } else {
        setError(data.error || "AI改善に失敗しました");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "通信エラー");
    }
    setImproving(false);
    setImproveTarget(null);
  };

  const draftPages = pages.filter((p) => p.status === "draft" || p.status === "pending" || p.status === "private");
  const publishedPages = pages.filter((p) => p.status === "publish");

  const statusLabel = (status: string) => {
    switch (status) {
      case "draft": return { text: "下書き", color: "bg-yellow-100 text-yellow-700" };
      case "publish": return { text: "公開中", color: "bg-green-100 text-green-700" };
      case "pending": return { text: "レビュー待ち", color: "bg-blue-100 text-blue-700" };
      case "private": return { text: "非公開", color: "bg-gray-100 text-gray-700" };
      default: return { text: status, color: "bg-gray-100 text-gray-700" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && !pluginNeeded && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-500 mt-1 underline">閉じる</button>
        </div>
      )}

      {/* Plugin needed message */}
      {pluginNeeded && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <h3 className="font-bold text-orange-800 mb-2">WordPressプラグインが必要です</h3>
          <p className="text-sm text-orange-700 mb-3">
            症状ページ（symptomscat）をこのツールから読み書きするには、
            WordPressに小さなプラグインを1つ入れる必要があります。
          </p>
          <div className="bg-white rounded-lg p-4 text-sm space-y-2">
            <p className="font-medium text-gray-800">手順：</p>
            <ol className="list-decimal ml-5 text-gray-600 space-y-1">
              <li>WordPress管理画面にログイン</li>
              <li>プラグイン → 新規追加 → プラグインをアップロード</li>
              <li><code className="bg-gray-100 px-1 rounded">oguchi-rest-api.php</code> をアップロードして有効化</li>
              <li>このページに戻って「ページ読み込み」ボタンを押す</li>
            </ol>
            <p className="text-xs text-gray-500 mt-2">
              ※このプラグインは症状ページ等のカスタム投稿タイプをREST APIに公開するだけの安全なプラグインです
            </p>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingPage && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{editingPage.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${statusLabel(editingPage.status).color}`}>
                    {statusLabel(editingPage.status).text}
                  </span>
                  <span className="text-xs text-gray-400">ID: {editingPage.id}</span>
                </div>
              </div>
              <button onClick={() => setEditingPage(null)} className="text-gray-400 hover:text-gray-600 text-xl">x</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {saveMsg && (
                <div className={`p-3 rounded-lg text-sm ${saveMsg.includes("エラー") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                  {saveMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">タイトル</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">HTMLコード</label>
                  <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={25}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">プレビュー</label>
                  <div className="border border-gray-200 rounded-lg p-4 overflow-y-auto" style={{ height: "calc(25 * 1.5rem + 1rem)" }}>
                    <div dangerouslySetInnerHTML={{ __html: editContent }} className="prose prose-sm max-w-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex gap-2">
              <button onClick={() => savePage()} disabled={saving}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300">
                {saving ? "保存中..." : "下書き保存"}
              </button>
              <button onClick={() => savePage("publish")} disabled={saving}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-gray-300">
                {saving ? "..." : "公開する"}
              </button>
              <button onClick={() => setEditingPage(null)}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main controls */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-lg mb-2">WordPress下書きページ管理</h3>
        <p className="text-xs text-gray-500 mb-4">
          WordPressの症状ページ（下書き含む）を読み込んで、編集・改善・公開できます
        </p>

        {!wp ? (
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-700">設定タブでWordPress連携情報を入力してください</p>
          </div>
        ) : (
          <button onClick={fetchDrafts} disabled={loading}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300">
            {loading ? "読み込み中..." : `WordPressから症状ページを読み込む`}
          </button>
        )}
      </div>

      {/* Draft pages */}
      {draftPages.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-lg mb-1">下書き・非公開ページ ({draftPages.length}件)</h3>
          <p className="text-xs text-gray-500 mb-4">編集して公開できる状態に整えましょう</p>

          <div className="space-y-2">
            {draftPages.map((page) => {
              const text = page.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
              const wordCount = text.length;
              const isAnalyzing = analyzing === page.id;

              return (
                <div key={page.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${statusLabel(page.status).color}`}>
                          {statusLabel(page.status).text}
                        </span>
                        <p className="font-medium text-gray-800 text-sm truncate">{page.title}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {wordCount.toLocaleString()}文字 / /{page.slug}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => analyzePage(page)}
                        className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs hover:bg-purple-100">
                        分析
                      </button>
                      <button onClick={() => handleImprove(page)}
                        disabled={improving && improveTarget === page.id}
                        className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs hover:bg-orange-100 disabled:opacity-50">
                        {improving && improveTarget === page.id ? "改善中..." : "AI改善"}
                      </button>
                      <button onClick={() => openEditor(page)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs hover:bg-indigo-100">
                        編集
                      </button>
                    </div>
                  </div>

                  {/* Analysis results */}
                  {isAnalyzing && analysis && analysis.pageId === page.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                      <div className="flex gap-3 text-xs">
                        <span className="text-gray-500">文字数: <strong className={wordCount >= 5000 ? "text-green-600" : wordCount >= 2000 ? "text-yellow-600" : "text-red-600"}>{wordCount.toLocaleString()}</strong></span>
                        <span className="text-gray-500">H2: <strong>{analysis.sectionCount}個</strong></span>
                      </div>
                      {analysis.issues.length > 0 && (
                        <div className="space-y-0.5">
                          {analysis.issues.map((issue, i) => (
                            <p key={i} className="text-xs text-red-600">- {issue}</p>
                          ))}
                        </div>
                      )}
                      {analysis.suggestions.length > 0 && (
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium text-blue-700">追加を推奨:</p>
                          {analysis.suggestions.map((s, i) => (
                            <p key={i} className="text-xs text-blue-600">- {s}</p>
                          ))}
                        </div>
                      )}
                      <button onClick={() => setAnalyzing(null)} className="text-[10px] text-gray-400 hover:text-gray-600">閉じる</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Published pages */}
      {publishedPages.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-lg mb-3">公開中のページ ({publishedPages.length}件)</h3>
          <div className="space-y-2">
            {publishedPages.map((page) => (
              <div key={page.id} className="p-3 bg-green-50 rounded-lg flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="font-medium text-gray-800 text-sm truncate">{page.title}</p>
                  <p className="text-xs text-gray-400">/{page.slug}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <a href={page.link} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-white text-green-600 rounded-lg text-xs hover:bg-green-100 border border-green-200">
                    表示
                  </a>
                  <button onClick={() => openEditor(page)}
                    className="px-3 py-1.5 bg-white text-indigo-600 rounded-lg text-xs hover:bg-indigo-50 border border-indigo-200">
                    編集
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {pages.length === 0 && !loading && !error && wp && (
        <div className="text-center py-8 text-gray-400 text-sm">
          「WordPressから症状ページを読み込む」ボタンを押してください
        </div>
      )}
    </div>
  );
}
