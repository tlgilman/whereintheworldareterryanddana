import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getPhotos, deletePhoto, getAlbums } from "@/lib/google-sheets";
import { Photo } from "@/app/types/Photo";
import { extractAlbumPhotos } from "@/lib/google-photos-album";

// "uploadedBy" is the email address of whoever added a photo. This list is public (the home page reads it),
// so the address goes only to people who are signed in. Everyone else gets the same list with it left empty.

/** Is whoever is asking signed in? If that cannot be worked out, the answer is no. */
async function isSignedIn(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    return Boolean(session?.user);
  } catch (error) {
    console.error("Could not read the session, so treating this visitor as signed out:", error);
    return false;
  }
}

/** The list as this visitor may see it. Makes copies: the rows it is given are shared with every other request. */
function photosFor(signedIn: boolean, photos: Photo[]) {
  const list = signedIn ? photos : photos.map((photo) => ({ ...photo, uploadedBy: "" }));
  // The answer depends on who is asking, so nothing between here and the browser may keep a copy to hand to someone else.
  return NextResponse.json(list, { headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationFilter = searchParams.get("location");
    const countryFilter = searchParams.get("country");

    const [signedIn, allPhotos] = await Promise.all([isSignedIn(), getPhotos()]);
    let filteredPhotos = allPhotos;

    if (locationFilter) {
      filteredPhotos = filteredPhotos.filter(
        (p) => p.location.toLowerCase() === locationFilter.toLowerCase()
      );
    }

    if (countryFilter) {
      filteredPhotos = filteredPhotos.filter(
        (p) => p.country.toLowerCase() === countryFilter.toLowerCase()
      );
    }

    // Also fetch & resolve Google Photos Shared Albums
    try {
      let albums = await getAlbums();

      if (locationFilter) {
        albums = albums.filter(
          (a) => a.location.toLowerCase() === locationFilter.toLowerCase()
        );
      }

      if (countryFilter) {
        albums = albums.filter(
          (a) => a.country.toLowerCase() === countryFilter.toLowerCase()
        );
      }

      const albumPhotosPromises = albums.map(async (album) => {
        try {
          const result = await extractAlbumPhotos(album.albumUrl);
          return result.photos.map((photoUrl, index) => ({
            id: `album_${album.id}_p${index}`,
            location: album.location,
            country: album.country,
            url: photoUrl,
            source: "google_photos" as const,
            caption: `${album.title} (Google Photos Album)`,
            uploadedBy: album.createdBy || "Terry & Dana",
            uploadedAt: album.createdAt || new Date().toISOString(),
          }));
        } catch (err) {
          console.error(`Error resolving album ${album.albumUrl}:`, err);
          return [];
        }
      });

      const resolvedAlbumPhotosSets = await Promise.all(albumPhotosPromises);
      const resolvedAlbumPhotos = resolvedAlbumPhotosSets.flat();

      // Combine individual photos + album photos
      const combinedPhotos: Photo[] = [...filteredPhotos, ...resolvedAlbumPhotos];
      return photosFor(signedIn, combinedPhotos);
    } catch (albumErr) {
      console.error("Error fetching album photos:", albumErr);
    }

    return photosFor(signedIn, filteredPhotos);
  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Photo ID is required" }, { status: 400 });
    }

    const success = await deletePhoto(id);

    if (!success) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Photo deleted successfully" });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
