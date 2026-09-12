import Link from "next/link";
import { redirect } from "next/navigation";

import { Routes } from "@/routes";
import { cn } from "@/lib/utils";
import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { SignIn } from "@/components/auth/signin";
import { SignUp } from "@/components/auth/signup";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

// Keep in sync with TIM_SANDBOX_EMAIL in prisma/seed.ts (not imported directly --
// that file runs its seed as a side effect at import time).
const TIM_SANDBOX_EMAIL = "tim.sandbox@example.com";

export default async function LogInPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  const userId = await getLoggedInUserId();
  const params = await searchParams;

  if (userId) {
    const redirectTo = params?.callbackUrl ? params.callbackUrl : Routes.Home;
    return redirect(redirectTo);
  }

  const timSandbox =
    process.env.NODE_ENV !== "production"
      ? await prismaClient.user.findUnique({
          where: { email: TIM_SANDBOX_EMAIL },
          select: { email: true },
        })
      : null;

  return (
    <div className={cn("grid grid-cols-2 h-screen")}>
      <div
        className={cn(
          "bg-zinc-900 px-12 py-14 text-white font-light tracking-wide flex flex-col",
        )}
      >
        <div className={cn("flex items-center mb-4 gap-3")}>
          <Avatar>
            <AvatarImage src="/assets/logo.svg" />
          </Avatar>
          <span className={cn("text-4xl font-normal")}>tim</span>
        </div>
        <p className={cn("text-xl")}>
          The messaging platform for meaningful engagement.
        </p>
        <p className={cn("text-lg flex grow items-end")}>
          Meaningful engagement on the internet is dead but Tim is here to help.{" "}
          <br />
          We make it easy to communicate and share content with your social
          networks in an engaging and personal way.
        </p>
      </div>
      <div className={cn("px-10 py-12 flex flex-col")}>
        <div className={cn("flex justify-end gap-3")}>
          <SignIn />
          <ThemeToggle />
        </div>
        <div
          className={cn(
            "flex items-center flex-1 flex-col justify-center gap-4",
          )}
        >
          <h2 className={cn("text-2xl font-semibold")}>Create an account</h2>
          <SignUp />
          <p className={cn("text-muted-foreground text-center")}>
            By clicking Create an account, you agree to our{" "}
            <Link
              className={cn("underline underline-offset-4 hover:text-primary")}
              href={Routes.Terms}
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              className={cn("underline underline-offset-4 hover:text-primary")}
              href={Routes.Privacy}
            >
              Privacy Policy
            </Link>
            .
          </p>
          {timSandbox && (
            <div
              className={cn(
                "border rounded-md p-4 flex flex-col items-center gap-2 text-sm",
              )}
            >
              <p className={cn("text-muted-foreground")}>Dev only</p>
              <Button variant="secondary" asChild>
                {/* Plain <a>, not next/link's <Link>: this hits a route handler
                    that redirects after setting the session cookie, and a
                    client-side <Link> navigation here leaves the root layout
                    rendering its stale pre-login (logged-out) output instead
                    of picking up the new session. */}
                <a
                  href={`/api/dev/login?email=${encodeURIComponent(timSandbox.email ?? "")}`}
                >
                  Log in to Tim Sandbox
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
