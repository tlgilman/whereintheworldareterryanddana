import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getVisitors } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  // The visitor log holds IP addresses and where each visitor was: for administrators only, like /api/users.
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const visitors = await getVisitors();
    return NextResponse.json(visitors, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Error in visitors route:', error);
    return NextResponse.json({ error: 'Failed to fetch visitors' }, { status: 500 });
  }
}
