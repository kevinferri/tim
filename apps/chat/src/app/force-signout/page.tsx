"use client";

import { useEffectOnce } from "@/lib/hooks/use-effect-once";
import { signOut } from "next-auth/react";
import { Routes } from "@/routes";

export default function ForceLogout() {
  useEffectOnce(() => {
    signOut({ callbackUrl: Routes.SignIn });
  });

  return <></>;
}
