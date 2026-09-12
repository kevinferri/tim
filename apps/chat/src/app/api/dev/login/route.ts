import { encode } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { prismaClient } from "@/lib/prisma/client";
import { Routes } from "@/routes";

// Dev-only stand-in for Google sign-in: mints a real next-auth session JWT
// for a seeded user (see prisma/seed.ts) without going through OAuth.
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return new NextResponse("Missing ?email=", { status: 400 });
  }

  const user = await prismaClient.user.findUnique({ where: { email } });
  if (!user) {
    return new NextResponse(`No user with email ${email}`, { status: 404 });
  }

  const token = await encode({
    token: {
      name: user.name,
      email: user.email,
      picture: user.imageUrl,
      sub: user.id,
      id: user.id,
    },
    secret: process.env.NEXTAUTH_SECRET ?? "",
  });

  const response = NextResponse.redirect(new URL(Routes.Home, req.url));
  response.cookies.set(
    process.env.NEXTAUTH_COOKIE_KEY ?? "next-auth.session-token",
    token,
    { httpOnly: true, sameSite: "lax", path: "/" },
  );

  return response;
}
