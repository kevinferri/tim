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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getLoggedInUser();
  const socketConfig = await getSocketConfig(user);

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
          <Toaster />
          <SelfProvider user={user}>
            <SocketProvider {...socketConfig}>{children}</SocketProvider>
          </SelfProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
