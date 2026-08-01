import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { addPhoto } from "@/lib/google-sheets";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

function cleanGoogleCdnUrl(url: string): string {
  if (url.includes("googleusercontent.com") || url.includes("ggpht.com")) {
    // Replace crop parameters (e.g. =w1200-h630-p) with =s0 for original full resolution
    return url.replace(/=[ws]\d+(-h\d+)?.*$/i, "=s0");
  }
  return url;
}

async function resolveGooglePhotosUrl(inputUrl: string): Promise<string> {
  let cleanUrl = inputUrl.trim().replace(/[?&]authuser=\d+/g, "");
  cleanUrl = cleanGoogleCdnUrl(cleanUrl);

  if (
    cleanUrl.includes("photos.app.goo.gl") ||
    cleanUrl.includes("photos.google.com/share") ||
    cleanUrl.includes("goo.gl/photos")
  ) {
    try {
      const response = await fetch(cleanUrl, {
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      const html = await response.text();

      const ogMatch =
        html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i) ||
        html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);

      if (ogMatch && ogMatch[1]) {
        return cleanGoogleCdnUrl(ogMatch[1]);
      }
    } catch (e) {
      console.error("Error resolving Google Photos link:", e);
    }
  }

  return cleanUrl;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";

    let location = "";
    let country = "";
    let caption = "";
    let url = "";
    let source: "file_upload" | "google_photos" | "external_url" = "file_upload";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      location = (formData.get("location") as string) || "";
      country = (formData.get("country") as string) || "";
      caption = (formData.get("caption") as string) || "";
      const urlInput = (formData.get("url") as string) || "";
      const sourceInput = (formData.get("source") as string) || "";

      if (urlInput) {
        url = await resolveGooglePhotosUrl(urlInput);
        source = (sourceInput as "file_upload" | "google_photos" | "external_url") || "google_photos";
      } else if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Try local disk write, fallback to Data URI for serverless hosts (AWS Amplify / Vercel)
        try {
          const uploadDir = path.join(process.cwd(), "public", "uploads");
          await mkdir(uploadDir, { recursive: true });

          const ext = path.extname(file.name) || ".jpg";
          const filename = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
          const filePath = path.join(uploadDir, filename);

          await writeFile(filePath, buffer);
          url = `/uploads/${filename}`;
        } catch (fsError) {
          console.warn("Serverless read-only filesystem detected, converting uploaded file to Data URI:", fsError);
          const mimeType = file.type || "image/jpeg";
          url = `data:${mimeType};base64,${buffer.toString("base64")}`;
        }

        source = "file_upload";
      } else {
        return NextResponse.json(
          { error: "Either an image file or photo URL is required" },
          { status: 400 }
        );
      }
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      location = body.location || "";
      country = body.country || "";
      caption = body.caption || "";
      const rawUrl = body.url || "";
      source = body.source || "google_photos";

      if (!rawUrl) {
        return NextResponse.json(
          { error: "Photo URL is required" },
          { status: 400 }
        );
      }

      url = await resolveGooglePhotosUrl(rawUrl);
    } else {
      return NextResponse.json(
        { error: "Unsupported Content-Type" },
        { status: 400 }
      );
    }

    if (!location) {
      return NextResponse.json(
        { error: "Location is required" },
        { status: 400 }
      );
    }

    // Save to Google Sheets
    const newPhoto = await addPhoto({
      location,
      country,
      url,
      source,
      caption,
      uploadedBy: session.user.email || "Terry & Dana",
    });

    return NextResponse.json(newPhoto, { status: 201 });
  } catch (error) {
    console.error("Error uploading photo:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}
