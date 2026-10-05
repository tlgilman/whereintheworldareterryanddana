import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import page from "./home-page.json";

// The front door of the site is a plain HTML page, not a React page. Its source is preview-src/index.html;
// "npm run build" copies it into home-page.json first (see preview-src/README.md).
//
// Next compresses its own pages but not what a route like this one returns, so the page is compressed here,
// once, when the server starts. Brotli keeps it small enough to arrive in the first batch of data a new
// connection can carry; gzip is there for anything that does not take Brotli.
const plain = Buffer.from(page.html, "utf8");
const gzip = gzipSync(plain, { level: 9 });
const brotli = brotliCompressSync(plain, {
  params: {
    [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
    [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
    [constants.BROTLI_PARAM_SIZE_HINT]: plain.length,
  },
});

/** Does an Accept-Encoding header take this encoding? ("br;q=0" means no.) */
function takes(header: string, encoding: string) {
  return header.split(",").some((part) => {
    const [name, ...params] = part.trim().toLowerCase().split(";");
    return name.trim() === encoding && !params.some((p) => /^\s*q\s*=\s*0(\.0*)?\s*$/.test(p));
  });
}

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const accepted = request.headers.get("accept-encoding") ?? "";
  const encoding = takes(accepted, "br") ? "br" : takes(accepted, "gzip") ? "gzip" : "";
  const headers: Record<string, string> = {
    "content-type": "text/html; charset=utf-8",
    // The value Next puts on its own static pages: the hosting keeps a copy close to visitors until the next deployment.
    "cache-control": "s-maxage=31536000",
    vary: "Accept-Encoding",
  };
  if (encoding) headers["content-encoding"] = encoding;
  return new Response(encoding === "br" ? brotli : encoding === "gzip" ? gzip : plain, { headers });
}
