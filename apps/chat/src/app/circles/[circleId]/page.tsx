import { NotFound } from "@/components/ui/not-found";
import { prismaClient } from "@/lib/prisma/client";
import { redirect } from "next/navigation";

type Props = {
  params: { circleId: string };
};

export default async function CirclePage(props: Props) {
  const circle = await prismaClient.circle.getMeCircleById({
    circleId: props.params.circleId,
    select: {
      id: true,
      name: true,
      defaultTopicId: true,
    },
  });

  // Todo: landing page for circles
  if (!circle?.defaultTopicId) return <NotFound copy="Topic not found" />;
  redirect(`/circles/${circle.id}/topics/${circle.defaultTopicId}`);
}
