import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/options";
import { getDoc } from '@/lib/google-sheets';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  // Allow if admin OR if correct secret key is provided
  if ((!session || session.user?.role !== 'admin') && key !== 'debug_secret_123') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checks = {
    env: {
      GOOGLE_SHEET_ID: !!process.env.GOOGLE_SHEET_ID,
      GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    },
    connectivity: {
      googleSheets: false,
      error: null as string | null,
    },
    timestamp: new Date().toISOString(),
  };

  try {
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
