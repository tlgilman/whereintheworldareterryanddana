export interface ParsedUserAgent {
  device: string;
  browser: string;
  os: string;
  summary: string;
}

export function parseUserAgent(uaString: string): ParsedUserAgent {
  if (!uaString || uaString === "unknown") {
    return {
      device: "Unknown Device",
      browser: "Unknown Browser",
      os: "Unknown OS",
      summary: "Unknown Device",
    };
  }

  const ua = uaString.toLowerCase();

  // Detect Operating System & Device Type
  let deviceType = "💻 Desktop";
  let os = "Unknown OS";

  if (ua.includes("iphone")) {
    deviceType = "📱 iPhone";
    os = "iOS";
  } else if (ua.includes("ipad")) {
    deviceType = "📱 iPad";
    os = "iPadOS";
  } else if (ua.includes("android")) {
    deviceType = ua.includes("mobile") ? "📱 Android Phone" : "📱 Android Tablet";
    os = "Android";
  } else if (ua.includes("windows")) {
    deviceType = "💻 Windows PC";
    os = "Windows";
  } else if (ua.includes("macintosh") || ua.includes("mac os x")) {
    deviceType = "💻 Mac";
    os = "macOS";
  } else if (ua.includes("crkey") || ua.includes("chromecast") || ua.includes("smart-tv")) {
    deviceType = "📺 Smart TV";
    os = "TV OS";
  } else if (ua.includes("linux")) {
    deviceType = "💻 Linux PC";
    os = "Linux";
  }

  // Detect Browser
  let browser = "Web Browser";
  if (ua.includes("edg/") || ua.includes("edge/")) {
    browser = "Edge";
  } else if (ua.includes("chrome/") && !ua.includes("chromium/")) {
    browser = "Chrome";
  } else if (ua.includes("safari/") && !ua.includes("chrome/")) {
    browser = "Safari";
  } else if (ua.includes("firefox/")) {
    browser = "Firefox";
  } else if (ua.includes("samsungbrowser/")) {
    browser = "Samsung Internet";
  }

  const summary = `${deviceType} (${browser} on ${os})`;

  return {
    device: deviceType,
    browser,
    os,
    summary,
  };
}
