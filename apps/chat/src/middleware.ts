import { Routes } from "@/routes";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("next-auth.session-token");

  // Public API routes
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (!sessionToken) {
    return NextResponse.redirect(`${process.env.BASE_URL}${Routes.SignIn}`);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|static|signin|assets).*)",
  ],
};
