import React, { cache } from "react";
import { GeistSans } from "geist/font/sans";
import jwt from "jsonwebtoken";
import { User } from "@prisma/client";

import { ThemeProvider } from "@/components/ui/theme-provider";
import { SocketProvider } from "@/components/socket/socket-provider";
import { Toaster } from "@/components/ui/toaster";
import { prismaClient } from "@/lib/prisma/client";
import { SelfProvider } from "@/components/auth/self-provider";

import "@/globals.css";
import { UserRoomConnect } from "./components/layouts/dashboard/user-room-connect";
import { CircleRoomConnect } from "./components/layouts/dashboard/circle-room-connect";
import { ActiveCircleMembersProvider } from "./components/layouts/dashboard/active-circle-members-provider";
import { CirclesNav } from "./circles/circles-nav";

export const DEFAULT_TITLE = "Tim";

const getLoggedInUser = cache(async () => {
  const user = await prismaClient.user.getLoggedIn({
    select: {
      id: true,
      name: true,
      email: true,
      imageUrl: true,
      createdAt: true,
    },
  });

  return user ?? undefined;
});

export async function generateMetadata() {
  const user = await getLoggedInUser();

  return {
    title: `${DEFAULT_TITLE} - ${user?.email ?? "Dashboard"}`,
  };
}

async function getSocketConfig(user?: User) {
  const token = user
    ? jwt.sign(JSON.stringify(user), process.env.CHAT_SERVER_AUTH_SECRET ?? "")
    : undefined;

  return {
    jwt: token,
    endpoint: process.env.CHAT_SERVER_URL ?? "",
    path: process.env.CHAT_SERVER_PATH ?? "",
  };
}

function BaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.className}>
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
                  <ActiveCircleMembersProvider>
                    <CirclesNav circles={circles} />
                    {children}
                  </ActiveCircleMembersProvider>
                </div>
              </div>
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

  if (!user) {
    return <LoggedOutLayout>{children}</LoggedOutLayout>;
  }

  return <LoggedInLayout>{children}</LoggedInLayout>;
}
