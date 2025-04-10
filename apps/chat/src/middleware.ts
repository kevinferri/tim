import { Routes } from "@/routes";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const headers = new Headers(req.headers);

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    pathname === Routes.SignIn
  ) {
    return NextResponse.next();
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(process.env.NEXTAUTH_COOKIE_KEY ?? "");

  if (pathname.startsWith("/api/") && !sessionToken) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!sessionToken) {
    return NextResponse.redirect(`${process.env.FRONTEND_URL}${Routes.SignIn}`);
  }

  headers.set("x-current-path", pathname);

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|favicon.ico).*)"],
};
