import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/cart", "/checkout", "/orders", "/profile"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isProtected) {
    const sessionCookie = request.cookies.get("auth_session");
    if (!sessionCookie?.value) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/cart/:path*", "/checkout/:path*", "/orders/:path*", "/profile/:path*"],
};
