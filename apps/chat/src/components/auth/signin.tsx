"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export const SignIn = () => {
  return (
    <Button variant="ghost" onClick={() => signIn("google")}>
      Sign in
    </Button>
  );
};
