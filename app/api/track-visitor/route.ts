import { NextRequest, NextResponse } from 'next/server';
import { trackVisit } from '@/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    // Get IP from headers (standard for Vercel/proxies) or fallback
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Await the result to catch errors for debugging
    await trackVisit(ip, userAgent);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in track-visitor route:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
