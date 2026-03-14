import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { siteUrl, username, appPassword, title, content, slug, status, metaDescription } = await req.json();

  if (!siteUrl || !username || !appPassword) {
    return NextResponse.json({ error: "WordPress接続情報が不足しています" }, { status: 400 });
  }

  const baseUrl = siteUrl.replace(/\/$/, "");
  const authToken = Buffer.from(`${username}:${appPassword}`).toString("base64");

  const postData: Record<string, unknown> = {
    title,
    content,
    status: status || "draft",
  };
  if (slug) postData.slug = slug;
  if (metaDescription) {
    postData.meta = { _yoast_wpseo_metadesc: metaDescription };
  }

  try {
    // 固定ページとして投稿
    const res = await fetch(`${baseUrl}/wp-json/wp/v2/pages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authToken}`,
      },
      body: JSON.stringify(postData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // 固定ページが無効な場合、通常投稿にフォールバック
      if (res.status === 404 || res.status === 403) {
        const postRes = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${authToken}`,
          },
          body: JSON.stringify(postData),
        });
        if (postRes.ok) {
          const post = await postRes.json();
          return NextResponse.json({ success: true, postId: post.id, postUrl: post.link });
        }
      }
      return NextResponse.json({ error: err.message || `WP API error ${res.status}` }, { status: res.status });
    }

    const page = await res.json();
    return NextResponse.json({ success: true, postId: page.id, postUrl: page.link });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "投稿エラー" }, { status: 500 });
  }
}

// 接続テスト
export async function PUT(req: NextRequest) {
  const { siteUrl, username, appPassword } = await req.json();
  const baseUrl = siteUrl.replace(/\/$/, "");
  const authToken = Buffer.from(`${username}:${appPassword}`).toString("base64");

  try {
    const res = await fetch(`${baseUrl}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: `Basic ${authToken}` },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `接続エラー (${res.status})` }, { status: res.status });
    }
    const user = await res.json();
    return NextResponse.json({ success: true, userName: user.name });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "接続失敗" }, { status: 500 });
  }
}
