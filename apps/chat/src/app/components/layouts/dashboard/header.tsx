import { ThemeToggle } from "@/components/ui/theme-toggle";
import { prismaClient } from "@/lib/prisma/client";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { UserDropDown } from "@/components/ui/user-dropdown";
import Link from "next/link";
import { Routes } from "@/routes";

export const Header = async () => {
  const user = await prismaClient.user.getLoggedIn();

  return (
    <div className="flex flex-row flex-1 items-center px-4 py-2 border-b-[1px] shadow-sm">
      <div className="flex gap-2">
        <Link href={Routes.Home} className="hover:opacity-80">
          <Avatar className="h-8 w-8 border shadow-sm">
            <AvatarImage src="/assets/logo.svg" />
          </Avatar>
        </Link>
      </div>
      <div className="flex ml-auto gap-2">
        <ThemeToggle buttonProps={{ variant: "outline", size: "iconSm" }} />
        {user && (
          <UserDropDown
            avatarUrl={user.imageUrl ?? undefined}
            email={user.email ?? undefined}
            name={user.name ?? undefined}
          />
        )}
      </div>
    </div>
  );
};
