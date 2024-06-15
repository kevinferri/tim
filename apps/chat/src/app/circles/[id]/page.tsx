import { NotFound } from "@/components/ui/not-found";
import { prismaClient } from "@/lib/prisma/client";
import { getLinkForTopic } from "@/routes";
import { redirect } from "next/navigation";

export default async function GroupPage({
  params,
}: {
  params: { id: string };
}) {
  const circle = await prismaClient.circle.getMeCircleById({
    circleId: params.id,
    select: {
      id: true,
      name: true,
      defaultTopicId: true,
    },
  });

  if (!circle?.defaultTopicId) return <NotFound copy="Topic not found" />;
  redirect(getLinkForTopic(circle.defaultTopicId));
}
