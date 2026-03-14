"use client";

import { useState, useCallback, useRef } from "react";
import { BlogDraft, GenerationConfig, WPConnection } from "@/lib/types";

interface Props {
  blogs: BlogDraft[];
  config: GenerationConfig;
  wp: WPConnection | null;
  onUpdate: (blogs: BlogDraft[]) => void;
}

export default function BlogTab({ blogs, config, wp, onUpdate }: Props) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<"symptom" | "blog">("blog");
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMeta, setEditMeta] = useState("");
  const [posting, setPosting] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleGenerate = useCallback(async () => {
    if (!keyword.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), category, config }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      const newBlog: BlogDraft = {
        id: Date.now().toString(),
        title: data.title || keyword,
        content: data.content || "",
        category,
        keyword: keyword.trim(),
        metaDescription: data.metaDescription || "",
        status: "draft",
        createdAt: new Date().toISOString(),
      };
      onUpdate([newBlog, ...blogs]);
      setKeyword("");
    } catch (err) {
      alert("生成に失敗しました: " + String(err));
    } finally {
      setGenerating(false);
    }
  }, [keyword, category, config, blogs, onUpdate]);

  const startEdit = (blog: BlogDraft) => {
    setEditingId(blog.id);
    setEditTitle(blog.title);
    setEditMeta(blog.metaDescription);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = blog.content;
      }
    }, 50);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const updated = blogs.map((b) =>
      b.id === editingId
        ? { ...b, title: editTitle, metaDescription: editMeta, content: editorRef.current?.innerHTML || b.content }
        : b
    );
    onUpdate(updated);
    setEditingId(null);
  };

  const deleteBlog = (id: string) => {
    if (!confirm("この記事を削除しますか？")) return;
    onUpdate(blogs.filter((b) => b.id !== id));
  };

  const postToWP = async (blog: BlogDraft) => {
    if (!wp?.siteUrl || !wp?.username || !wp?.appPassword) {
      alert("WordPress連携を設定してください。");
      return;
    }
    setPosting(blog.id);
    try {
      const res = await fetch("/api/wp-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wp,
          title: blog.title,
          content: blog.content,
          status: "draft",
          excerpt: blog.metaDescription,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert("投稿エラー: " + data.error);
        return;
      }
      const updated = blogs.map((b) =>
        b.id === blog.id ? { ...b, status: "posted" as const, wpPostId: data.id } : b
      );
      onUpdate(updated);
      alert("WordPressに下書きとして投稿しました。");
    } catch (err) {
      alert("投稿に失敗しました: " + String(err));
    } finally {
      setPosting(null);
    }
  };

  // Toolbar commands for rich editor
  const execCommand = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  return (
    <div className="space-y-6">
      {/* Blog Generation */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-lg mb-4">ブログ記事生成</h3>
        <p className="text-xs text-gray-500 mb-3">
          キーワードを入力するとAIがSEO最適化されたブログ記事を自動生成します
        </p>
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as "symptom" | "blog")}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="blog">ブログ記事</option>
            <option value="symptom">症状ページ</option>
          </select>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="キーワード（例: 腰痛 ストレッチ）"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          />
          <button
            onClick={handleGenerate}
            disabled={generating || !keyword.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
          >
            {generating ? "生成中..." : "AI生成"}
          </button>
        </div>
      </div>

      {/* Editor Modal */}
      {editingId && (
        <div className="bg-white rounded-xl shadow-sm p-5 border-2 border-indigo-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">記事編集</h3>
            <div className="flex gap-2">
              <button onClick={saveEdit} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium">保存</button>
              <button onClick={() => setEditingId(null)} className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm">閉じる</button>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="記事タイトル"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              value={editMeta}
              onChange={(e) => setEditMeta(e.target.value)}
              placeholder="メタディスクリプション"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {/* Rich Editor Toolbar */}
            <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-lg border border-gray-200">
              <button onClick={() => execCommand("bold")} className="px-2 py-1 text-xs font-bold bg-white border border-gray-200 rounded hover:bg-gray-100">B</button>
              <button onClick={() => execCommand("italic")} className="px-2 py-1 text-xs italic bg-white border border-gray-200 rounded hover:bg-gray-100">I</button>
              <button onClick={() => execCommand("underline")} className="px-2 py-1 text-xs underline bg-white border border-gray-200 rounded hover:bg-gray-100">U</button>
              <span className="w-px h-6 bg-gray-300 self-center mx-1" />
              <button onClick={() => execCommand("formatBlock", "h2")} className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-100">H2</button>
              <button onClick={() => execCommand("formatBlock", "h3")} className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-100">H3</button>
              <button onClick={() => execCommand("formatBlock", "p")} className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-100">P</button>
              <span className="w-px h-6 bg-gray-300 self-center mx-1" />
              <button onClick={() => execCommand("insertUnorderedList")} className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-100">UL</button>
              <button onClick={() => execCommand("insertOrderedList")} className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-100">OL</button>
              <span className="w-px h-6 bg-gray-300 self-center mx-1" />
              <button onClick={() => {
                const url = prompt("リンクURLを入力してください");
                if (url) execCommand("createLink", url);
              }} className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-100">Link</button>
              <button onClick={() => execCommand("removeFormat")} className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-100 text-red-500">Clear</button>
            </div>

            {/* ContentEditable Editor */}
            <div
              ref={editorRef}
              contentEditable
              className="w-full min-h-[300px] max-h-[500px] overflow-y-auto px-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 prose prose-sm max-w-none"
              style={{ lineHeight: "1.8" }}
            />
          </div>
        </div>
      )}

      {/* Blog List */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-3">
          記事一覧 ({blogs.length}件)
        </h3>

        {blogs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">記事がありません</p>
            <p className="text-xs mt-1">上のフォームからAI生成してください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blogs.map((blog) => (
              <div key={blog.id} className="border border-gray-200 rounded-xl p-4 hover:border-indigo-200 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        blog.status === "posted"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {blog.status === "posted" ? "投稿済み" : "下書き"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        blog.category === "symptom"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {blog.category === "symptom" ? "症状" : "ブログ"}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(blog.createdAt).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-800 text-sm truncate">{blog.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 truncate">{blog.metaDescription}</p>
                    <p className="text-[10px] text-gray-400 mt-1">KW: {blog.keyword}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => startEdit(blog)}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    編集
                  </button>
                  {blog.status !== "posted" && wp && (
                    <button
                      onClick={() => postToWP(blog)}
                      disabled={posting === blog.id}
                      className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {posting === blog.id ? "投稿中..." : "WP投稿"}
                    </button>
                  )}
                  <button
                    onClick={() => deleteBlog(blog.id)}
                    className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
