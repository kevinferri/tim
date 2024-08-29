"use client";

import { useEffectOnce } from "@/lib/hooks";
import { signOut } from "next-auth/react";

export default function ForceLogout() {
  useEffectOnce(() => {
    signOut();
  });

  return <></>;
}
