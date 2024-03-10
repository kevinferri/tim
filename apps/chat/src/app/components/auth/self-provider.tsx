"use client";

import { createContext, useContext } from "react";
import { User } from "@prisma/client";

type Self = Pick<User, "id" | "name" | "email" | "imageUrl">;
const SelfContext = createContext<Self | undefined>(undefined);

export function SelfProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: Self;
}) {
  return <SelfContext.Provider value={user}>{children}</SelfContext.Provider>;
}

export function useSelf() {
  const context = useContext(SelfContext);

  if (!context) {
    throw new Error("useSelf must be used inside SelfProvider");
  }

  return context;
}
