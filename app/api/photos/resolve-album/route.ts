import { NextRequest, NextResponse } from "next/server";
import { extractAlbumPhotos } from "@/lib/google-photos-album";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
    }

    const result = await extractAlbumPhotos(targetUrl);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Error resolving Google Photos album:", error);
    const msg = error instanceof Error ? error.message : "Failed to resolve album link";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
