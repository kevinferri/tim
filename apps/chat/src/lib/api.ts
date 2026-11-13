import { NextResponse } from "next/server";
import { getLoggedInUserId } from "@/lib/session";
import { ApiError } from "@/lib/api-error";

export { ApiError };

/**
 * Wraps a route handler: an ApiError becomes its status and message; anything
 * else is logged and becomes a generic 500, so internals never leak.
 * Builds a fresh Response per request (a Response body can only be read once).
 */
// Keeps the handler's exact parameters, which Next type-checks on route exports.
export function apiRoute<Args extends [Request?, ...unknown[]]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          { error: err.message },
          { status: err.status },
        );
      }
      const [req] = args;
      const where = req ? `${req.method} ${new URL(req.url).pathname}` : "";
      console.error(`[api] ${where}`, err);
      return NextResponse.json({ error: "Request failed" }, { status: 500 });
    }
  };
}

export async function requireUserId() {
  const userId = await getLoggedInUserId();
  if (!userId) throw new ApiError(401);
  return userId;
}
