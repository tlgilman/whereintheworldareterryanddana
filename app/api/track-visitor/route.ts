import { NextRequest, NextResponse } from "next/server";
import { trackVisit } from "@/lib/google-sheets";
import { parseUserAgent } from "@/lib/user-agent-parser";

interface GeoLookupResult {
  city?: string;
  state?: string;
  country?: string;
  isp?: string;
}

async function lookupIpGeo(ip: string): Promise<GeoLookupResult> {
  // Ignore local loopback IPs
  if (!ip || ip === "unknown" || ip === "127.0.0.1" || ip === "::1") {
    return {};
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s timeout so visitor tracking never slows down responses

    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === "success") {
        return {
          city: data.city || undefined,
          state: data.regionName || undefined,
          country: data.country || undefined,
          isp: data.isp || undefined,
        };
      }
    }
  } catch (e) {
    console.warn("GeoIP lookup bypassed:", e);
  }

  return {};
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Extract REAL client IP (handling CloudFront / proxy header lists)
    const rawIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const ip = rawIp.split(",")[0].trim();

    // Extract User-Agent & parse device info
    const userAgent = request.headers.get("user-agent") || "unknown";
    const parsedUa = parseUserAgent(userAgent);

    // First check AWS CloudFront edge headers if available
    let country = request.headers.get("cloudfront-viewer-country-name") || request.headers.get("cloudfront-viewer-country") || undefined;
    let state = request.headers.get("cloudfront-viewer-country-region-name") || request.headers.get("cloudfront-viewer-country-region") || undefined;
    let city = request.headers.get("cloudfront-viewer-city") || undefined;
    let isp: string | undefined = undefined;

    // Fallback to IP Geo lookup if CloudFront headers are incomplete
    if (!state || !city) {
      const geo = await lookupIpGeo(ip);
      if (!city && geo.city) city = geo.city;
      if (!state && geo.state) state = geo.state;
      if (!country && geo.country) country = geo.country;
      if (geo.isp) isp = geo.isp;
    }

    await trackVisit({
      ip,
      userAgent,
      device: parsedUa.summary,
      path: body.path || "/",
      referrer: body.referrer || undefined,
      city: city || undefined,
      state: state || undefined,
      country: country || undefined,
      isp: isp || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in track-visitor route:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
