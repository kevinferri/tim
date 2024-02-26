"use client";

import { useFormStatus } from "react-dom";
import { ButtonProps, Button } from "./button";

export function SubmitButton({
  children,
  buttonProps,
}: {
  children: React.ReactNode;
  buttonProps?: ButtonProps;
}) {
  const { pending } = useFormStatus();

  return (
    <Button {...buttonProps} type="submit" disabled={pending}>
      {children}
    </Button>
  );
}
