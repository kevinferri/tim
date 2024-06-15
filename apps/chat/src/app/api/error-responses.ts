import { NextResponse } from "next/server";

export const badRequest = NextResponse.json(
  { error: "Bad request" },
  { status: 400 }
);

export const unauthorized = NextResponse.json(
  { error: "Unauthorized" },
  { status: 401 }
);

export const notFound = NextResponse.json(
  { error: "Not found" },
  { status: 404 }
);
