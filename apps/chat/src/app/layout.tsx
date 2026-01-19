import React, { cache } from "react";
import { GeistSans } from "geist/font/sans";
import jwt from "jsonwebtoken";
import { User } from "@prisma/client";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { SocketProvider } from "@/components/socket/socket-provider";
import { Toaster } from "@/components/ui/toaster";
import { prismaClient } from "@/lib/prisma/client";
import { SelfProvider } from "@/components/auth/self-provider";
import { UserRoomConnect } from "@/components/dashboard/user-room-connect";
import { CircleRoomConnect } from "@/components/dashboard/circle-room-connect";
import { CirclesNav } from "@/components/circles/circles-nav";
import { GlobalVideoPlayer } from "@/components/topics/global-video-player";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { Routes } from "@/routes";

import "@/globals.css";

const getLoggedInUser = cache(async () => {
  const user = await prismaClient.user.getLoggedIn({
    select: {
      id: true,
      name: true,
      email: true,
      imageUrl: true,
      createdAt: true,
      status: true,
      lastStatusUpdate: true,
    },
  });

  return user ?? undefined;
});

export const DEFAULT_TITLE = "Tim";

export async function generateMetadata() {
  const user = await getLoggedInUser();

  return {
    title: `${DEFAULT_TITLE} - ${user?.email ?? "Welcome"}`,
  };
}

async function getSocketConfig(user?: User) {
  const token = user
    ? jwt.sign(JSON.stringify(user), process.env.JWT_SECRET ?? "")
    : undefined;

  return {
    jwt: token,
    endpoint: process.env.WS_SERVER_URL ?? "",
    path: process.env.WS_SERVER_PATH ?? "",
  };
}

function BaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.className} suppressHydrationWarning>
      <head />
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

function LoggedOutLayout({ children }: { children: React.ReactNode }) {
  return <BaseLayout>{children}</BaseLayout>;
}

async function LoggedInLayout({ children }: { children: React.ReactNode }) {
  const user = await getLoggedInUser();
  const socketConfig = await getSocketConfig(user);
  const circles = await prismaClient.circle.getMeCircles({
    select: {
      id: true,
      name: true,
      defaultTopicId: true,
      imageUrl: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const circleIds = circles?.map(({ id }) => id);

  return (
    <BaseLayout>
      <Toaster />
      <SelfProvider user={user}>
        <SocketProvider {...socketConfig}>
          <UserRoomConnect>
            <CircleRoomConnect circleIds={circleIds ?? []}>
              <div className="flex flex-col h-screen">
                <div className="flex overflow-hidden basis-full">
                  <CirclesNav circles={circles} />
                  {children}
                </div>
              </div>
              <GlobalVideoPlayer />
            </CircleRoomConnect>
          </UserRoomConnect>
        </SocketProvider>
      </SelfProvider>
    </BaseLayout>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getLoggedInUser();
  const cookieStore = await cookies();
  const headerList = await headers();
  const pathname = headerList.get("x-current-path");
  const sessionToken = cookieStore.get(process.env.NEXTAUTH_COOKIE_KEY ?? "");

  // next-auth cookie in a bad state, sign out the user
  if (!user && sessionToken?.value && pathname !== Routes.ForceSignout) {
    return redirect(Routes.ForceSignout);
  }

  if (!user) {
    return <LoggedOutLayout>{children}</LoggedOutLayout>;
  }

  return <LoggedInLayout>{children}</LoggedInLayout>;
}
