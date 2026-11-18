import { CirclesNav } from "@/components/circles/circles-nav";
import { getUserCircles } from "@/lib/user-circles";
import { getLoggedInUserId } from "@/lib/session";

/** Pages with the app's chrome. Full-screen pages live in (full-screen) instead. */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getLoggedInUserId();
  if (!userId) return children;
  // Same id as the root layout's call, so this hits the per-request cache.
  const circles = await getUserCircles(userId);

  return (
    <>
      <CirclesNav circles={circles} />
      {children}
    </>
  );
}
