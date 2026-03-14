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

// 大口神経整体院の既存サイトから抽出した共通パーツ
const RECOMMENDED_PARTS: Omit<ContentPart, "id">[] = [
  {
    name: "選ばれる5つの理由",
    type: "custom",
    description: "全ページ共通：当院が選ばれる5つの理由",
    html: `<section>
<h2>大口神経整体院が【選ばれる５つの理由】</h2>

<h3>① 骨・筋肉だけで終わらせない「神経まで見る検査」</h3>
<p>多くの整体やリハビリは骨格や筋肉まで。当院では神経の伝達まで含めて検査・評価するため、「今まで原因が分からなかった不調」も見え方が変わります。</p>

<h3>② 強く押さない・痛くない"神経整体"</h3>
<p>バキバキ・ゴリゴリしません。皮膚から神経にやさしく働きかけるソフトな施術なので、ご高齢の方や重症の方も安心して受けていただけます。</p>

<h3>③ その場で「立つ・歩く・動く」の変化を実感</h3>
<p>施術後は立つ・歩く・体を動かすといった日常動作の変化を一緒に確認します。"感覚だけ"では終わらせません。</p>

<h3>④ 重症症状に特化した専門的な整体院</h3>
<p>「歩けない」「座れない」「外に出られない」「仕事に影響が出る」「好きな趣味が出来ない」そんな重症症状の方が多く来院され、一緒に改善を目指していきます！</p>

<h3>⑤ 姿勢・歩き方・生活動作まで一緒に整える</h3>
<p>施術だけで終わらず、立ち方・歩き方・座り方・セルフケアまで指導することで "戻りにくい体づくり"までサポートします。</p>
</section>`,
    usedIn: [],
  },
  {
    name: "施術の流れ",
    type: "custom",
    description: "全ページ共通：施術の流れ7ステップ",
    html: `<section>
<h2>施術の流れ</h2>

<h3>①問診表のご記入・カウンセリング</h3>
<p>まずは現在の身体のお悩みや、日常生活で困っていることなどを詳しく伺います。お話を聞かずにいきなり施術をするようなことはありません。</p>

<h3>②根本的な原因を見つけ出す検査</h3>
<p>痛みの出る動作や、関節の動きを見ていきます。また姿勢やゆがみなども合わせてチェックします。そのため痛みのあるところだけでなく、全身のチェックをしていきます。</p>

<h3>③お身体の現状の説明</h3>
<p>検査の結果を説明します。なぜ痛みが出ているのかを説明して、ご自身の身体の状態を理解していただくことで施術後の変化もわかりやすくなります。</p>

<h3>④施術</h3>
<p>検査結果をもとに、お一人おひとりに合わせた施術を行います。神経にやさしく働きかけるソフトな施術です。</p>

<h3>⑤施術後の確認</h3>
<p>施術後、お身体の状態を一緒に確認します。姿勢や動作の違いを実際に感じてください。</p>

<h3>⑥セルフケアの指導</h3>
<p>施術効果を持続させるためのセルフケアをご紹介します。それぞれの方に合ったセルフケアの提案が可能です。</p>

<h3>⑦お会計と次回予約</h3>
<p>お会計と次回ご予約をして終了となります。一緒に頑張って改善していきましょう！</p>
</section>`,
    usedIn: [],
  },
  {
    name: "院長メッセージ",
    type: "profile",
    description: "全ページ共通：院長 大口陽平からのメッセージ",
    html: `<section>
<h2>院長からのメッセージ</h2>
<p>はじめまして。重症症状専門　大口神経整体院代表の大口　陽平（おおぐちようへい）です。</p>
<p>僕は鍼灸師として鍼灸接骨院や介護施設などでのリハビリ事業で沢山の患者様のサポートをしてきました。数多くの勉強会と自分の数多くの怪我から学んだことがあります。</p>
<p>それは、「痛みの出ているところに原因はない」ということです。</p>
<p>痛みのある場所だけを見て施術するのではなく、神経の伝達から全身を見て根本原因にアプローチすることで、これまで改善しなかった症状も変化が出ています。</p>
<p>もし勇気をもって一歩踏み出してこれまでの辛さから解放されたいと思うなら、私も一緒に歩ませてください！</p>
</section>`,
    usedIn: [],
  },
  {
    name: "アクセス情報",
    type: "access",
    description: "全ページ共通：住所・営業時間・最寄駅",
    html: `<section>
<h2>店舗アクセス</h2>
<table>
<tr><th>院名</th><td>大口神経整体院</td></tr>
<tr><th>住所</th><td>〒558-0004 大阪市住吉区長居東4丁目2-7 長居中央ビル304号</td></tr>
<tr><th>電話</th><td><a href="tel:07084982968">070-8498-2968</a></td></tr>
<tr><th>営業時間</th><td>平日 10:00〜21:00 / 土 10:00〜18:00（完全予約制）</td></tr>
<tr><th>定休日</th><td>水・日　その他不定休</td></tr>
<tr><th>最寄駅</th><td>地下鉄御堂筋線 長居駅 徒歩1分 / JR阪和線 長居駅 徒歩3分</td></tr>
</table>
</section>`,
    usedIn: [],
  },
  {
    name: "予約CTA",
    type: "cta",
    description: "全ページ共通：電話・LINE予約への誘導ボタン",
    html: `<section style="text-align:center; padding:2em 1em; background:#f8f9fa; border-radius:12px; margin:2em 0;">
<p style="font-size:1.2em; font-weight:bold; margin-bottom:0.5em;">痛みで悩むのはこれで最後です</p>
<p style="margin-bottom:1em;">「ホームページをみました」とお伝えください！</p>
<p style="font-size:0.9em; margin-bottom:1.5em;">初回 <strong style="font-size:1.5em; color:#e53e3e;">3,980円</strong>（通常8,800円）</p>
<p style="margin-bottom:0.5em;">
  <a href="tel:07084982968" style="display:inline-block; background:#2563eb; color:#fff; padding:12px 32px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:1.1em;">電話予約 070-8498-2968</a>
</p>
<p>
  <a href="https://utage-system.com/line/open/Dxf5LUU0g7Vx" style="display:inline-block; background:#06c755; color:#fff; padding:12px 32px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:1.1em;" target="_blank" rel="noopener">LINE予約はこちら</a>
</p>
</section>`,
    usedIn: [],
  },
  {
    name: "初回料金案内",
    type: "custom",
    description: "全ページ共通：初回3,980円の料金案内",
    html: `<section>
<h2>痛みの根本改善プログラム</h2>
<p>なぜ初回3,980円なのか理由があります。</p>
<p>当院の施術で注射を受け続けていた方や手術を勧められた方が改善しているからこそ、あなたにも諦めてほしくないから。</p>
<p>まずは初回3,980円（通常8,800円）で当院の施術を体験してください。</p>
</section>`,
    usedIn: [],
  },
];

export default function PartsTab({ parts, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<ContentPart["type"]>("cta");
  const [html, setHtml] = useState("");
  const [description, setDescription] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadSuccess, setLoadSuccess] = useState(false);

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
          <div className="flex gap-2">
            <button
              onClick={() => {
                const existingNames = parts.map((p) => p.name);
                const newParts = RECOMMENDED_PARTS
                  .filter((rp) => !existingNames.includes(rp.name))
                  .map((rp) => ({ ...rp, id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }));
                if (newParts.length > 0) {
                  onUpdate([...parts, ...newParts]);
                  setLoadSuccess(true);
                  setTimeout(() => setLoadSuccess(false), 3000);
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                loadSuccess ? "bg-green-500 text-white" : "bg-green-100 text-green-700 hover:bg-green-200"
              }`}
            >
              {loadSuccess ? `${RECOMMENDED_PARTS.length}件読み込みました` : "サイトの共通パーツを読み込む"}
            </button>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              + パーツ追加
            </button>
          </div>
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
