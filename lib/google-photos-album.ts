interface ExtractedAlbumResult {
  title: string;
  count: number;
  photos: string[];
  albumUrl: string;
}

export async function extractAlbumPhotos(albumUrl: string): Promise<ExtractedAlbumResult> {
  const cleanUrl = albumUrl.trim().replace(/[?&]authuser=\d+/g, "");

  if (
    !cleanUrl.includes("photos.app.goo.gl") &&
    !cleanUrl.includes("photos.google.com/share") &&
    !cleanUrl.includes("goo.gl/photos") &&
    !cleanUrl.includes("photos.google.com/album")
  ) {
    throw new Error("Invalid Google Photos album link.");
  }

  const response = await fetch(cleanUrl, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Google Photos album (HTTP ${response.status})`);
  }

  const html = await response.text();

  // Extract Album Title if present
  let title = "Google Photos Album";
  const titleMatch =
    html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);

  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].replace(/ - Google Photos$/i, "").trim();
  }

  // Extract all Google Photos CDN image URLs (lh3.googleusercontent.com/pw/... or /drive-viewer/...)
  // Google Photos embeds high-res CDN URLs in JavaScript data arrays on the shared page
  const cdnRegex = /"(https:\/\/[a-z0-9\-]+\.googleusercontent\.com\/pw\/[A-Za-z0-9\-_]+)"/g;
  const matches = new Set<string>();

  let match;
  while ((match = cdnRegex.exec(html)) !== null) {
    if (match[1]) {
      // Append =s0 to ensure 100% full original uncropped resolution
      const fullResUrl = `${match[1]}=s0`;
      matches.add(fullResUrl);
    }
  }

  // Fallback regex for secondary Googleusercontent CDN structures
  if (matches.size === 0) {
    const fallbackRegex = /"(https:\/\/[a-z0-9\-]+\.googleusercontent\.com\/[A-Za-z0-9\-_=]{40,})"/g;
    while ((match = fallbackRegex.exec(html)) !== null) {
      if (match[1] && !match[1].includes("/proxy/") && !match[1].includes("/avatar/")) {
        const cleanCdn = match[1].replace(/=[ws]\d+(-h\d+)?.*$/i, "") + "=s0";
        matches.add(cleanCdn);
      }
    }
  }

  // Also check og:image meta tag if set
  const ogMatch =
    html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);

  if (ogMatch && ogMatch[1] && matches.size === 0) {
    const ogClean = ogMatch[1].replace(/=[ws]\d+(-h\d+)?.*$/i, "") + "=s0";
    matches.add(ogClean);
  }

  const photosList = Array.from(matches);

  return {
    title,
    count: photosList.length,
    photos: photosList,
    albumUrl: cleanUrl,
  };
}
