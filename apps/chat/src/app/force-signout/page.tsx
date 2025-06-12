"use client";

import { useEffectOnce } from "@/lib/hooks/use-effect-once";
import { signOut } from "next-auth/react";

export default function ForceLogout() {
  useEffectOnce(() => {
    signOut();
  });

  return <></>;
}
