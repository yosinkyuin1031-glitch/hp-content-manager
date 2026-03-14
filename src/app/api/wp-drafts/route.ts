import { NextRequest, NextResponse } from "next/server";

// GET: Fetch all pages (including drafts) from WordPress
export async function GET(req: NextRequest) {
  const siteUrl = req.nextUrl.searchParams.get("siteUrl");
  const username = req.nextUrl.searchParams.get("username");
  const appPassword = req.nextUrl.searchParams.get("appPassword");
  const postType = req.nextUrl.searchParams.get("postType") || "symptomscat";
  const perPage = req.nextUrl.searchParams.get("perPage") || "100";

  if (!siteUrl || !username || !appPassword) {
    return NextResponse.json({ error: "WordPress接続情報が不足しています" }, { status: 400 });
  }

  const auth = Buffer.from(`${username}:${appPassword}`).toString("base64");

  try {
    // Try the custom post type first
    const statuses = "draft,publish,pending,private";
    const url = `${siteUrl}/wp-json/wp/v2/${postType}?per_page=${perPage}&status=${statuses}&_fields=id,title,slug,status,content,excerpt,date,modified,link`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 404) {
      // Post type not found in REST API - plugin not installed
      return NextResponse.json({
        error: "REST_NOT_AVAILABLE",
        message: `カスタム投稿タイプ「${postType}」がREST APIに公開されていません。WordPressにプラグインをインストールしてください。`,
      }, { status: 404 });
    }

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({
        error: "AUTH_FAILED",
        message: "WordPress認証に失敗しました。ユーザー名とアプリケーションパスワードを確認してください。",
      }, { status: 401 });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({
        error: "WP_ERROR",
        message: err.message || `WordPress APIエラー (${res.status})`,
      }, { status: res.status });
    }

    const pages = await res.json();
    const totalPages = res.headers.get("X-WP-TotalPages") || "1";
    const total = res.headers.get("X-WP-Total") || String(pages.length);

    return NextResponse.json({
      pages: pages.map((p: Record<string, unknown>) => ({
        id: p.id,
        title: (p.title as Record<string, string>)?.rendered || "",
        slug: p.slug,
        status: p.status,
        content: (p.content as Record<string, string>)?.rendered || "",
        excerpt: (p.excerpt as Record<string, string>)?.rendered || "",
        date: p.date,
        modified: p.modified,
        link: p.link,
      })),
      total: parseInt(total as string),
      totalPages: parseInt(totalPages as string),
    });
  } catch (e) {
    return NextResponse.json(
      { error: "NETWORK_ERROR", message: e instanceof Error ? e.message : "通信エラー" },
      { status: 500 }
    );
  }
}

// PUT: Update a page (edit content, change status to publish, etc.)
export async function PUT(req: NextRequest) {
  const { siteUrl, username, appPassword, postId, postType, updates } = await req.json();

  if (!siteUrl || !username || !appPassword || !postId) {
    return NextResponse.json({ error: "必要な情報が不足しています" }, { status: 400 });
  }

  const auth = Buffer.from(`${username}:${appPassword}`).toString("base64");
  const type = postType || "symptomscat";

  try {
    const res = await fetch(`${siteUrl}/wp-json/wp/v2/${type}/${postId}`, {
      method: "POST", // WP REST API uses POST for updates
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({
        error: err.message || `更新に失敗しました (${res.status})`,
      }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      id: data.id,
      status: data.status,
      link: data.link,
      title: data.title?.rendered,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "通信エラー" },
      { status: 500 }
    );
  }
}
