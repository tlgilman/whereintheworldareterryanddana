import { NextRequest, NextResponse } from 'next/server';
import { trackVisit } from '@/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    // Get IP from headers (standard for Vercel/proxies) or fallback
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Fire and forget - don't await to keep response fast
    trackVisit(ip, userAgent).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in track-visitor route:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
