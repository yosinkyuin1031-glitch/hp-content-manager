"use client";

import { useState } from "react";
import { PageAnalysis } from "@/lib/types";

// 大口神経整体院の既知の症状ページ
const KNOWN_PAGES = [
  { symptom: "脊柱管狭窄症", url: "https://oguchi-seitai-osaka.com/symptomscat/post-3217/" },
  { symptom: "腰痛", url: "https://oguchi-seitai-osaka.com/symptomscat/post-3546/" },
  { symptom: "ぎっくり腰", url: "https://oguchi-seitai-osaka.com/symptomscat/post-4387/" },
  { symptom: "椎間板ヘルニア", url: "https://oguchi-seitai-osaka.com/symptomscat/post-3979/" },
  { symptom: "腰椎分離症", url: "https://oguchi-seitai-osaka.com/symptomscat/post-4389/" },
  { symptom: "腰椎すべり症", url: "https://oguchi-seitai-osaka.com/symptomscat/post-3980/" },
  { symptom: "坐骨神経痛", url: "https://oguchi-seitai-osaka.com/symptomscat/post-2700/" },
  { symptom: "梨状筋症候群", url: "https://oguchi-seitai-osaka.com/symptomscat/post-4391/" },
  { symptom: "仙腸関節炎", url: "https://oguchi-seitai-osaka.com/symptomscat/post-4392/" },
  { symptom: "変形性股関節症", url: "https://oguchi-seitai-osaka.com/symptomscat/post-4712/" },
  { symptom: "股関節痛", url: "https://oguchi-seitai-osaka.com/symptomscat/post-4713/" },
  { symptom: "膝痛", url: "https://oguchi-seitai-osaka.com/symptomscat/post-3501/" },
  { symptom: "変形性膝関節症", url: "https://oguchi-seitai-osaka.com/symptomscat/post-3976/" },
  { symptom: "自律神経失調症", url: "https://oguchi-seitai-osaka.com/symptomscat/post-3492/" },
];

interface Props {
  scans: PageAnalysis[];
  onUpdate: (scans: PageAnalysis[]) => void;
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : score >= 40 ? "bg-orange-500" : "bg-red-500";
  const textColor = score >= 80 ? "text-green-700" : score >= 60 ? "text-yellow-700" : score >= 40 ? "text-orange-700" : "text-red-700";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${textColor}`}>{score}</span>
    </div>
  );
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={ok ? "text-green-500" : "text-red-400"}>{ok ? "OK" : "NG"}</span>
      <span className={ok ? "text-gray-700" : "text-red-600 font-medium"}>{label}</span>
    </div>
  );
}

export default function ScanTab({ scans, onUpdate }: Props) {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, name: "" });
  const [customUrl, setCustomUrl] = useState("");
  const [customSymptom, setCustomSymptom] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<PageAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scanPage = async (url: string, symptom: string): Promise<PageAnalysis | null> => {
    try {
      const res = await fetch("/api/scan-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) {
        setErrorMsg(`${symptom}: ${data.error}`);
        return null;
      }
      return {
        id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        url,
        symptom,
        scannedAt: new Date().toISOString(),
        ...data.result,
      };
    } catch (e) {
      setErrorMsg(`${symptom}: ${e instanceof Error ? e.message : "通信エラー"}`);
      return null;
    }
  };

  const handleScanAll = async () => {
    setScanning(true);
    setErrorMsg(null);
    const total = KNOWN_PAGES.length;
    setProgress({ current: 0, total, name: "" });

    const results: PageAnalysis[] = [];
    for (let i = 0; i < KNOWN_PAGES.length; i++) {
      const page = KNOWN_PAGES[i];
      setProgress({ current: i + 1, total, name: page.symptom });
      const result = await scanPage(page.url, page.symptom);
      if (result) results.push(result);
    }

    onUpdate(results);
    setScanning(false);
  };

  const handleScanSingle = async (url: string, symptom: string) => {
    setScanning(true);
    setErrorMsg(null);
    setProgress({ current: 1, total: 1, name: symptom });
    const result = await scanPage(url, symptom);
    if (result) {
      const existing = scans.filter((s) => s.url !== url);
      onUpdate([...existing, result]);
    }
    setScanning(false);
  };

  const handleScanCustom = async () => {
    if (!customUrl || !customSymptom) return;
    await handleScanSingle(customUrl, customSymptom);
    setCustomUrl("");
    setCustomSymptom("");
  };

  const handleDeleteScan = (id: string) => {
    onUpdate(scans.filter((s) => s.id !== id));
    if (selectedDetail?.id === id) setSelectedDetail(null);
  };

  // Summary stats
  const avgScore = scans.length > 0 ? Math.round(scans.reduce((a, b) => a + b.overallScore, 0) / scans.length) : 0;
  const allIssues = scans.flatMap((s) => s.issues);
  const allSuggestions = scans.flatMap((s) => s.suggestions);

  // Count common issues
  const issueCounts = allIssues.reduce<Record<string, number>>((acc, issue) => {
    const key = issue.replace(/\d+/g, "N");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topIssues = Object.entries(issueCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Error toast */}
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 max-w-md p-4 bg-red-50 border border-red-200 rounded-xl shadow-lg">
          <div className="flex items-start gap-2">
            <span className="text-red-500 text-sm font-medium flex-shrink-0">Error</span>
            <p className="text-sm text-red-700">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600 flex-shrink-0 ml-2">x</button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{selectedDetail.symptom} - 分析詳細</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedDetail.url}</p>
              </div>
              <button onClick={() => setSelectedDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">x</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Scores */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-3xl font-bold" style={{ color: selectedDetail.overallScore >= 70 ? "#22c55e" : selectedDetail.overallScore >= 50 ? "#eab308" : "#ef4444" }}>
                    {selectedDetail.overallScore}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">総合スコア</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <ScoreBar score={selectedDetail.structureScore} label="構造" />
                  <ScoreBar score={selectedDetail.contentScore} label="コンテンツ" />
                  <ScoreBar score={selectedDetail.ctaScore} label="CTA" />
                  <ScoreBar score={selectedDetail.seoScore} label="SEO" />
                </div>
              </div>

              {/* Structure info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-bold text-gray-700 text-sm mb-3">ページ構造</h4>
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-lg font-bold text-gray-800">{selectedDetail.wordCount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">文字数</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-lg font-bold text-gray-800">{selectedDetail.imageCount}</p>
                    <p className="text-xs text-gray-500">画像数</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-lg font-bold text-gray-800">{selectedDetail.h2List.length}</p>
                    <p className="text-xs text-gray-500">H2見出し</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-600">H1: <span className="text-gray-800">{selectedDetail.h1 || "（なし）"}</span></p>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-800">H2一覧 ({selectedDetail.h2List.length}件)</summary>
                    <ul className="mt-1 ml-4 space-y-0.5 text-gray-700">
                      {selectedDetail.h2List.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </details>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-800">H3一覧 ({selectedDetail.h3List.length}件)</summary>
                    <ul className="mt-1 ml-4 space-y-0.5 text-gray-700">
                      {selectedDetail.h3List.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </details>
                </div>
              </div>

              {/* Content checks */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-bold text-gray-700 text-sm mb-3">コンテンツチェック</h4>
                <div className="grid grid-cols-2 gap-2">
                  <CheckItem ok={selectedDetail.hasCTA} label={`CTA（${selectedDetail.ctaDetails || "なし"}）`} />
                  <CheckItem ok={selectedDetail.hasTestimonials} label={`お客様の声（${selectedDetail.testimonialCount}件）`} />
                  <CheckItem ok={selectedDetail.hasOwnerProfile} label="院長プロフィール" />
                  <CheckItem ok={selectedDetail.hasTreatmentFlow} label="施術の流れ" />
                  <CheckItem ok={selectedDetail.hasReasons} label="選ばれる理由" />
                  <CheckItem ok={selectedDetail.hasSymptomExplanation} label="症状の詳しい説明" />
                  <CheckItem ok={selectedDetail.hasFAQ} label={`FAQ（${selectedDetail.faqCount}件）`} />
                  <CheckItem ok={selectedDetail.hasPricing} label="料金情報" />
                  <CheckItem ok={selectedDetail.hasAccessInfo} label="アクセス情報" />
                </div>
              </div>

              {/* Issues & Suggestions */}
              {selectedDetail.issues.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="font-bold text-red-700 text-sm mb-2">問題点</h4>
                  <ul className="space-y-1">
                    {selectedDetail.issues.map((issue, i) => (
                      <li key={i} className="text-xs text-red-600 flex items-start gap-2">
                        <span className="flex-shrink-0 mt-0.5">-</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedDetail.suggestions.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-bold text-blue-700 text-sm mb-2">改善提案</h4>
                  <ul className="space-y-1">
                    {selectedDetail.suggestions.map((s, i) => (
                      <li key={i} className="text-xs text-blue-600 flex items-start gap-2">
                        <span className="flex-shrink-0 mt-0.5">-</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="p-4 border-t">
              <button onClick={() => setSelectedDetail(null)} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* Scan controls */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-lg mb-2">ページスキャン・分析</h3>
        <p className="text-xs text-gray-500 mb-4">
          既存の症状ページをスキャンして、構造・コンテンツ・CTA・SEOの品質を自動分析します
        </p>

        {scanning && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>{progress.name}をスキャン中...</span>
              <span>{progress.current}/{progress.total}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button
            onClick={handleScanAll}
            disabled={scanning}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300"
          >
            {scanning ? `スキャン中 (${progress.current}/${progress.total})...` : `全14ページを一括スキャン`}
          </button>
        </div>

        {/* Quick scan buttons */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-600 mb-2">個別スキャン:</p>
          <div className="flex flex-wrap gap-1.5">
            {KNOWN_PAGES.map((p) => {
              const existing = scans.find((s) => s.url === p.url);
              return (
                <button
                  key={p.url}
                  onClick={() => handleScanSingle(p.url, p.symptom)}
                  disabled={scanning}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    existing
                      ? existing.overallScore >= 70
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : existing.overallScore >= 50
                        ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  } disabled:opacity-50`}
                >
                  {p.symptom}{existing ? ` (${existing.overallScore})` : ""}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom URL scan */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-600 mb-2">カスタムURL:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customSymptom}
              onChange={(e) => setCustomSymptom(e.target.value)}
              placeholder="症状名"
              className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleScanCustom}
              disabled={scanning || !customUrl || !customSymptom}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300"
            >
              スキャン
            </button>
          </div>
        </div>
      </div>

      {/* Summary dashboard */}
      {scans.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-lg mb-4">分析結果サマリー</h3>

          {/* Overview stats */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold" style={{ color: avgScore >= 70 ? "#22c55e" : avgScore >= 50 ? "#eab308" : "#ef4444" }}>{avgScore}</p>
              <p className="text-xs text-gray-500">平均スコア</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-800">{scans.length}</p>
              <p className="text-xs text-gray-500">スキャン済</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-red-500">{allIssues.length}</p>
              <p className="text-xs text-gray-500">問題点合計</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-500">{allSuggestions.length}</p>
              <p className="text-xs text-gray-500">改善提案</p>
            </div>
          </div>

          {/* Common issues */}
          {topIssues.length > 0 && (
            <div className="mb-5 p-4 bg-red-50 rounded-lg">
              <h4 className="font-bold text-red-700 text-sm mb-2">共通の問題点</h4>
              <div className="space-y-1">
                {topIssues.map(([issue, count], i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="bg-red-200 text-red-700 rounded-full px-2 py-0.5 font-bold flex-shrink-0">{count}件</span>
                    <span className="text-red-600">{issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Page-by-page results */}
          <div className="space-y-2">
            {scans
              .sort((a, b) => a.overallScore - b.overallScore)
              .map((scan) => (
                <div
                  key={scan.id}
                  className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => setSelectedDetail(scan)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{
                          backgroundColor: scan.overallScore >= 70 ? "#22c55e" : scan.overallScore >= 50 ? "#eab308" : "#ef4444",
                        }}
                      >
                        {scan.overallScore}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{scan.symptom}</p>
                        <p className="text-xs text-gray-400 truncate">{scan.wordCount.toLocaleString()}文字 / 画像{scan.imageCount}枚 / H2:{scan.h2List.length}個</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="hidden sm:flex gap-1">
                        {[
                          { ok: scan.hasTestimonials, label: "声" },
                          { ok: scan.hasTreatmentFlow, label: "流れ" },
                          { ok: scan.hasReasons, label: "理由" },
                          { ok: scan.hasFAQ, label: "FAQ" },
                          { ok: scan.hasOwnerProfile, label: "院長" },
                        ].map((item, i) => (
                          <span
                            key={i}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              item.ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                            }`}
                          >
                            {item.label}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteScan(scan.id); }}
                        className="text-gray-300 hover:text-red-500 text-xs"
                      >
                        x
                      </button>
                    </div>
                  </div>
                  {scan.issues.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {scan.issues.slice(0, 3).map((issue, i) => (
                        <span key={i} className="text-[10px] text-red-500 bg-red-50 px-2 py-0.5 rounded">{issue}</span>
                      ))}
                      {scan.issues.length > 3 && (
                        <span className="text-[10px] text-gray-400">+{scan.issues.length - 3}件</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
