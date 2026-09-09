"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { BrandIcons } from "@/components/ui/brand-icons";

export const SignUp = () => {
  return (
    <Button variant="default" onClick={() => signIn("google")}>
      <BrandIcons.google className="mr-2 h-4 w-4" /> Sign up with Google
    </Button>
  );
};
