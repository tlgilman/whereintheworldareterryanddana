import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getAlbums, addAlbum, deleteAlbum } from "@/lib/google-sheets";
import { extractAlbumPhotos } from "@/lib/google-photos-album";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationParam = searchParams.get("location");
    const countryParam = searchParams.get("country");

    let albums = await getAlbums();

    if (locationParam) {
      albums = albums.filter((a) => a.location.toLowerCase() === locationParam.toLowerCase());
    }

    if (countryParam) {
      albums = albums.filter((a) => a.country.toLowerCase() === countryParam.toLowerCase());
    }

    return NextResponse.json(albums);
  } catch (error) {
    console.error("Error fetching albums:", error);
    return NextResponse.json({ error: "Failed to fetch albums" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { albumUrl, location, country, title } = body;

    if (!albumUrl || !location) {
      return NextResponse.json(
        { error: "Album URL and Location are required" },
        { status: 400 }
      );
    }

    let resolvedTitle = title || "Google Photos Album";
    let photoCount = 0;

    try {
      const albumDetails = await extractAlbumPhotos(albumUrl);
      if (albumDetails.title) resolvedTitle = albumDetails.title;
      photoCount = albumDetails.count;
    } catch (e) {
      console.warn("Could not extract album details upfront:", e);
    }

    const newAlbum = await addAlbum({
      albumUrl: albumUrl.trim(),
      location: location.trim(),
      country: country ? country.trim() : "",
      title: resolvedTitle,
      photoCount: photoCount,
      createdBy: session.user.email || "Terry & Dana",
    });

    return NextResponse.json(newAlbum, { status: 201 });
  } catch (error: unknown) {
    console.error("Error adding album:", error);
    const msg = error instanceof Error ? error.message : "Failed to add album";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Album ID is required" }, { status: 400 });
    }

    const success = await deleteAlbum(id);
    if (!success) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Album deleted successfully" });
  } catch (error) {
    console.error("Error deleting album:", error);
    return NextResponse.json({ error: "Failed to delete album" }, { status: 500 });
  }
}
