import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getPhotos, deletePhoto } from "@/lib/google-sheets";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationFilter = searchParams.get("location");
    const countryFilter = searchParams.get("country");

    const allPhotos = await getPhotos();

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

    return NextResponse.json(filteredPhotos);
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
