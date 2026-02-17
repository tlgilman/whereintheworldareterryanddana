import { NextResponse } from 'next/server';
import { getVisitors } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const visitors = await getVisitors();
    return NextResponse.json(visitors);
  } catch (error) {
    console.error('Error in visitors route:', error);
    return NextResponse.json({ error: 'Failed to fetch visitors' }, { status: 500 });
  }
}
