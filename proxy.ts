import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The web app and the Capacitor mobile shell (which loads ropinder.vercel.app
// directly rather than bundling a separate origin) both call this API
// same-origin. There's no legitimate cross-origin caller, so we don't grant
// one — omitting Access-Control-Allow-Origin makes the browser enforce the
// default same-origin policy on every /api/* route.
export function proxy(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return NextResponse.json({}, { status: 204 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
