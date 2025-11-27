import { NextResponse } from 'next/server';
import { fetchTravelData } from '@/lib/google-sheets';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/options";

export async function GET() {
  try {
    // We can add caching here later if needed
    const data = await fetchTravelData();
    
    // If Google Sheets fails or returns empty (e.g. no creds yet), 
    // we could fallback to the static file, but for now let's return what we have.
    // In a real scenario, we might want to merge or fallback.
    
    return NextResponse.json(data);
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch travel data', 
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  // Check if user is admin
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await request.json(); // Consume body even if unused for now
    // Here we would call addTrip or updateTrip from lib/google-sheets
    // For now, just return success
    return NextResponse.json({ success: true, message: "Trip added (simulation)" });
  } catch {
    return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
  }
}
