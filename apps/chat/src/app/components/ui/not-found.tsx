import Link from "next/link";
import { HomeIcon } from "@radix-ui/react-icons";

import { Button } from "@/components/ui/button";
import { Routes } from "@/routes";

export function NotFound({ copy }: { copy?: string }) {
  return (
    <div className="flex flex-1 flex-basis-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="text-2xl">{copy ? copy : "Page not found"}</div>
        <Link href={Routes.Home}>
          <Button
            variant="secondary"
            className="flex gap-3 text-lg font-normal"
          >
            <HomeIcon /> Go home
          </Button>
        </Link>
      </div>
    </div>
  );
}
