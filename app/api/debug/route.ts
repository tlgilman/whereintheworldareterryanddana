import { NextResponse, NextRequest } from 'next/server';

// Remove static imports that might crash
// import { getServerSession } from "next-auth/next";
// import { authOptions } from "../auth/[...nextauth]/options";
// import { getDoc } from '@/lib/google-sheets';

export async function GET(request: NextRequest) {
  // const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  // Simple key check, no auth session check to avoid crashing if NextAuth is broken
  if (key !== 'debug_secret_123') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checks = {
    env: {
      GOOGLE_SHEET_ID: !!process.env.GOOGLE_SHEET_ID,
      GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      // Add a check for the raw value length to see if it's empty string
      NEXTAUTH_SECRET_LEN: process.env.NEXTAUTH_SECRET ? process.env.NEXTAUTH_SECRET.length : 0,
    },
    connectivity: {
      googleSheets: false,
      error: null as string | null,
    },
    timestamp: new Date().toISOString(),
  };

  try {
    // Dynamically import to catch initialization errors
    const { getDoc } = await import('@/lib/google-sheets');
    const doc = await getDoc();
    await doc.loadInfo();
    checks.connectivity.googleSheets = true;
  } catch (error: unknown) {
    if (error instanceof Error) {
      checks.connectivity.error = error.message;
    } else {
      checks.connectivity.error = String(error);
    }
  }

  return NextResponse.json(checks);
}
