"use client";

import { useEffectOnce } from "@/lib/hooks";
import { useRouter } from "next/navigation";
import { Spinner } from "../ui/spinner";

type Props = {
  redirect: string;
};

export function MostRecentTopicRedirect(props: Props) {
  const router = useRouter();

  useEffectOnce(() => {
    router.replace(props.redirect);
  });

  return <Spinner className="w-10 h-10" />;
}
