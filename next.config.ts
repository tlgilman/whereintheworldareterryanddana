import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The preview of the next version is a plain page in public/preview. Next serves public files only by
  // their full name, so the short address would be a 404. Send it to the page.
  async redirects() {
    return [
      { source: "/preview", destination: "/preview/index.html", permanent: false },
    ];
  },
};

export default nextConfig;
