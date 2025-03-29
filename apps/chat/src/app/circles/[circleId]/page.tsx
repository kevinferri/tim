import { prismaClient } from "@/lib/prisma/client";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ circleId: string }>;
};

export default async function CirclePage(props: Props) {
  const { circleId } = await props.params;
  const circle = await prismaClient.circle.getMeCircleById({
    circleId,
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
