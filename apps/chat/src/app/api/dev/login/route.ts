import { encode } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { prismaClient } from "@/lib/prisma/client";
import { Routes } from "@/routes";

// Dev-only stand-in for Google sign-in: mints a session for a seeded user.
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return new NextResponse("Missing ?email=", { status: 400 });
  }

  // Scoped to seeded accounts only, so this can't become a login-as-anyone.
  const user = await prismaClient.user.getSeedUserByEmail({
    email,
    select: { id: true, name: true, email: true, imageUrl: true },
  });
  if (!user) {
    return new NextResponse(`No seeded user with email ${email}`, {
      status: 404,
    });
  }

  // No fallback: must match authOptions.secret (src/lib/session.ts) exactly.
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not set");
  }

  const token = await encode({
    token: {
      name: user.name,
      email: user.email,
      picture: user.imageUrl,
      sub: user.id,
      id: user.id,
    },
    secret,
  });

  const response = NextResponse.redirect(new URL(Routes.Home, req.url));
  response.cookies.set(
    process.env.NEXTAUTH_COOKIE_KEY ?? "next-auth.session-token",
    token,
    { httpOnly: true, sameSite: "lax", path: "/" },
  );

  return response;
}
