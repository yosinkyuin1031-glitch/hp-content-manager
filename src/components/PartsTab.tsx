"use client";

import { useState } from "react";
import { ContentPart } from "@/lib/types";

interface Props {
  parts: ContentPart[];
  onUpdate: (parts: ContentPart[]) => void;
}

const PART_TYPES: { value: ContentPart["type"]; label: string }[] = [
  { value: "cta", label: "CTA（予約誘導）" },
  { value: "profile", label: "院長プロフィール" },
  { value: "voice", label: "患者様の声" },
  { value: "access", label: "アクセス情報" },
  { value: "faq", label: "FAQ" },
  { value: "symptom-list", label: "症状一覧" },
  { value: "custom", label: "カスタム" },
];

export default function PartsTab({ parts, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<ContentPart["type"]>("cta");
  const [html, setHtml] = useState("");
  const [description, setDescription] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const resetForm = () => {
    setName(""); setType("cta"); setHtml(""); setDescription(""); setEditId(null); setShowForm(false);
  };

  const handleSave = () => {
    if (!name.trim() || !html.trim()) return;
    if (editId) {
      onUpdate(parts.map((p) => p.id === editId ? { ...p, name, type, html, description } : p));
    } else {
      onUpdate([...parts, { id: `part-${Date.now()}`, name, type, html, description, usedIn: [] }]);
    }
    resetForm();
  };

  const handleEdit = (part: ContentPart) => {
    setEditId(part.id);
    setName(part.name);
    setType(part.type);
    setHtml(part.html);
    setDescription(part.description);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("このパーツを削除しますか？")) {
      onUpdate(parts.filter((p) => p.id !== id));
    }
  };

  const handleCopy = (html: string) => {
    navigator.clipboard.writeText(html);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">まとめパーツ管理</h3>
            <p className="text-xs text-gray-500">ページに共通で使うHTMLパーツを管理します</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            + パーツ追加
          </button>
        </div>

        {showForm && (
          <div className="p-4 border-2 border-indigo-300 rounded-xl space-y-3 mb-4">
            <h4 className="font-bold text-gray-800">{editId ? "パーツ編集" : "新規パーツ"}</h4>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="パーツ名"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              <select value={type} onChange={(e) => setType(e.target.value as ContentPart["type"])}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                {PART_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="説明（任意）"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            <textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={8} placeholder="HTMLコードを入力"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={!name.trim() || !html.trim()}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300">
                {editId ? "更新" : "保存"}
              </button>
              <button onClick={resetForm} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                キャンセル
              </button>
            </div>
          </div>
        )}

        {parts.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">パーツが登録されていません</p>
        ) : (
          <div className="space-y-2">
            {parts.map((part) => (
              <div key={part.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        part.type === "cta" ? "bg-orange-100 text-orange-700"
                        : part.type === "profile" ? "bg-blue-100 text-blue-700"
                        : part.type === "voice" ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                      }`}>
                        {PART_TYPES.find((t) => t.value === part.type)?.label}
                      </span>
                      <p className="font-medium text-gray-800 text-sm">{part.name}</p>
                    </div>
                    {part.description && <p className="text-xs text-gray-500 mt-0.5">{part.description}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{part.html.length}文字</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setPreviewHtml(previewHtml === part.id ? null : part.id)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200">
                      {previewHtml === part.id ? "閉じる" : "プレビュー"}
                    </button>
                    <button onClick={() => handleCopy(part.html)}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs hover:bg-indigo-100">
                      コピー
                    </button>
                    <button onClick={() => handleEdit(part)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100">
                      編集
                    </button>
                    <button onClick={() => handleDelete(part.id)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100">
                      削除
                    </button>
                  </div>
                </div>
                {previewHtml === part.id && (
                  <div className="mt-3 p-4 bg-white border border-gray-200 rounded-lg">
                    <div dangerouslySetInnerHTML={{ __html: part.html }} className="prose prose-sm max-w-none" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
