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
  // The TRS-80 games are static files in public/games, so they answer only to
  // their own filenames: Next serves no directory index. /games is the address
  // people type and link to, so it is rewritten rather than redirected, which
  // keeps that address in the bar instead of exposing index.html.
  async rewrites() {
    return [
      { source: "/games", destination: "/games/index.html" },
    ];
  },
};

export default nextConfig;
