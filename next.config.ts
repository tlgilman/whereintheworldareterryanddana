import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The new site was first published as a preview at these addresses. It is the front door now
  // (app/route.ts), so anyone holding an old link is sent there. Its files still live in public/preview.
  async redirects() {
    return [
      { source: "/preview", destination: "/", permanent: false },
      { source: "/preview/index.html", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
