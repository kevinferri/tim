import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

import { Routes } from "@/routes";
import { cn } from "@/lib/utils";
import { SignIn } from "@/components/auth/signin";
import { SignUp } from "@/components/auth/signup";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

export default async function LogInPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | undefined };
}) {
  const session = await getServerSession();

  if (session) {
    const redirectTo = searchParams?.callbackUrl
      ? searchParams.callbackUrl
      : Routes.Home;
    return redirect(redirectTo);
  }

  return (
    <div className={cn("grid grid-cols-2 h-screen")}>
      <div
        className={cn(
          "bg-zinc-900 px-12 py-14 text-white font-light tracking-wide flex flex-col"
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
            "flex items-center flex-1 flex-col justify-center gap-4"
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
        </div>
      </div>
    </div>
  );
}
