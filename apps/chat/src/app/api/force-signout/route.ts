import { NextResponse } from "next/server";

import { Routes } from "@/routes";

// Corrupt/stale JWTs (e.g. after NEXTAUTH_SECRET rotation) can't be decrypted,
// so client-side signOut alone may leave the httpOnly session cookie in place
// and loop on /force-signout forever. Clear it here, then send the user to sign-in.
export async function GET(request: Request) {
  const cookieName = process.env.NEXTAUTH_COOKIE_KEY;
  const response = NextResponse.redirect(new URL(Routes.SignIn, request.url));

  if (cookieName) {
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
