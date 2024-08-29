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
      defaultTopicId: true,
    },
  });

  // TODO: landing page for circles
  if (!circle?.defaultTopicId) {
    redirect("/");
  }

  redirect(`/circles/${circle.id}/topics/${circle.defaultTopicId}`);
}
