import Link from "next/link";
import { HomeIcon, QuestionMarkIcon } from "@radix-ui/react-icons";

import { Button } from "@/components/ui/button";
import { Routes } from "@/routes";

export function NotFound({ copy }: { copy?: string }) {
  return (
    <div className="flex flex-col basis-full justify-center items-center gap-3 p-3 text-center">
      <div className="bg-secondary p-8 rounded-full border shadow-sm">
        <QuestionMarkIcon height={80} width={80} />
      </div>

      <div className="text-xl">{copy}</div>

      <Link href={Routes.Home}>
        <Button variant="secondary" className="flex gap-3 text-lg font-normal">
          <HomeIcon /> Go home
        </Button>
      </Link>
    </div>
  );
}
