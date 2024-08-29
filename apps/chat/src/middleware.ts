import { Routes } from "@/routes";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { unauthorized } from "@/app/api/error-responses";

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(process.env.NEXTAUTH_COOKIE_KEY ?? "");
  const headers = new Headers(req.headers);

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/") && !sessionToken) {
    return unauthorized;
  }

  if (!sessionToken) {
    return NextResponse.redirect(`${process.env.BASE_URL}${Routes.SignIn}`);
  }

  headers.set("x-current-path", req.nextUrl.pathname);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|static|signin|assets).*)",
  ],
};
