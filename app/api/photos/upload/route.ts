import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { addPhoto } from "@/lib/google-sheets";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
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
        url = urlInput;
        source = (sourceInput as "file_upload" | "google_photos" | "external_url") || "google_photos";
      } else if (file) {
        // Handle file upload
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure target uploads directory exists
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });

        // Generate safe unique filename
        const ext = path.extname(file.name) || ".jpg";
        const filename = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
        const filePath = path.join(uploadDir, filename);

        await writeFile(filePath, buffer);
        url = `/uploads/${filename}`;
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
      url = body.url || "";
      source = body.source || "google_photos";

      if (!url) {
        return NextResponse.json(
          { error: "Photo URL is required" },
          { status: 400 }
        );
      }
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
