import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
    }

    const cleanUrl = targetUrl.trim().replace(/[?&]authuser=\d+/g, "");

    // If it's a Google Photos app shortlink or share link
    if (cleanUrl.includes("photos.app.goo.gl") || cleanUrl.includes("photos.google.com/share") || cleanUrl.includes("goo.gl/photos")) {
      const response = await fetch(cleanUrl, {
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      const html = await response.text();

      // Extract og:image content
      const ogMatch =
        html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i) ||
        html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);

      if (ogMatch && ogMatch[1]) {
        return NextResponse.json({ resolvedUrl: ogMatch[1], originalUrl: targetUrl });
      }
    }

    return NextResponse.json({ resolvedUrl: cleanUrl, originalUrl: targetUrl });
  } catch (error) {
    console.error("Error resolving photo link:", error);
    return NextResponse.json({ error: "Failed to resolve photo link" }, { status: 500 });
  }
}
