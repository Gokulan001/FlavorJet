import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { GATE_COOKIE_NAME, verifySessionToken } from "@/lib/access-gate/session";

const protectedRoutes = ["/cart", "/checkout", "/orders", "/profile"];

// Routes that cost tokens/API credits — locked behind the interview access gate
// until a code is entered at /gate. See src/lib/access-gate/.
const GATE_PROTECTED_PAGES = ["/order-ai"];
const GATE_PROTECTED_API_PREFIXES = ["/api/chat", "/api/stt", "/api/tts"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isGatedApi = GATE_PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isGatedPage = GATE_PROTECTED_PAGES.some((route) => pathname === route || pathname.startsWith(route + "/"));

  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // ── Normal login check ───────────────────────────────────────────────────
  // /order-ai requires a regular account first, same as cart/checkout/orders/profile.
  // No `redirect` param here on purpose — after login the user lands on the menu
  // (home), then clicks into the AI assistant nav item themselves.
  if (isProtected || isGatedPage) {
    const sessionCookie = request.cookies.get("auth_session");
    if (!sessionCookie?.value) {
      const loginUrl = new URL("/login", request.url);
      if (isProtected) loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Interview Access Gate ────────────────────────────────────────────────
  // Only reached once the user is already logged in. Gates the token-costing
  // AI routes specifically — see src/lib/access-gate/.
  if (isGatedApi || isGatedPage) {
    const gateToken = request.cookies.get(GATE_COOKIE_NAME)?.value;
    if (!verifySessionToken(gateToken)) {
      if (isGatedApi) {
        return NextResponse.json(
          { error: "This demo is currently locked. Contact the site owner for an access code." },
          { status: 403 },
        );
      }
      const gateUrl = new URL("/gate", request.url);
      gateUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(gateUrl);
    }
  }

  const res = NextResponse.next();

  // ── Security Headers ────────────────────────────────────────────────────
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // ── CORS for API routes ─────────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (origin === allowedOrigin || !origin) {
      res.headers.set("Access-Control-Allow-Origin", allowedOrigin);
      res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token");
      res.headers.set("Access-Control-Allow-Credentials", "true");
    }

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: res.headers });
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/cart/:path*", "/checkout/:path*", "/orders/:path*", "/profile/:path*",
    "/order-ai/:path*", "/order-ai",
    "/api/:path*",
  ],
};
