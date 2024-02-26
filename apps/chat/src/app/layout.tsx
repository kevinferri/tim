import React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import jwt from "jsonwebtoken";
import { getServerSession } from "next-auth";

import { ThemeProvider } from "@/components/ui/theme-provider";
import { SocketProvider } from "@/components/socket/socket-provider";
import { authOptions } from "./lib/session";
import "@/globals.css";

export const metadata: Metadata = {
  title: "",
  description: "Tim messaging platform",
};

async function getSocketConfig() {
  const session = await getServerSession(authOptions);
  const token = session?.user
    ? jwt.sign(
        JSON.stringify({ id: session.user.id }),
        process.env.CHAT_SERVER_AUTH_SECRET ?? ""
      )
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
  const socketConfig = await getSocketConfig();

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
          <SocketProvider {...socketConfig}>{children}</SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
