export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/pictures/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
