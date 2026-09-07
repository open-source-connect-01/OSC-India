import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  try {
    const cleanUsername = username.replace(/^@/, "").trim();
    const res = await fetch(`https://github.com/users/${cleanUsername}/contributions`, {
      headers: {
        "User-Agent": "OSC-India-Dashboard",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch contributions from GitHub (status ${res.status})` },
        { status: res.status }
      );
    }

    const html = await res.text();
    const countMap = new Map<string, number>();
    const regex = /data-date="([^"]+)"[^>]*id="([^"]+)"[\s\S]*?<tool-tip[^>]*for="\2"[^>]*>([^<]*)<\/tool-tip>/g;

    let match;
    while ((match = regex.exec(html)) !== null) {
      const date = match[1];
      const text = match[3];

      let count = 0;
      if (text && !text.toLowerCase().includes("no contributions")) {
        const matchCount = text.match(/^(\d+)/);
        if (matchCount) {
          count = parseInt(matchCount[1], 10);
        }
      }

      if (count > 0) {
        countMap.set(date, count);
      }
    }

    const contributions = Array.from(countMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    return NextResponse.json({ success: true, contributions });
  } catch (err: any) {
    console.error("GitHub activity API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch contribution graph" },
      { status: 500 }
    );
  }
}
