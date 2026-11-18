import { cache } from "react";
import { prismaClient } from "@/lib/prisma/client";
import { getLoggedInUserId } from "@/lib/session";
import { NotFound } from "@/components/dashboard/not-found";
import { DEFAULT_TITLE } from "@/lib/constants";
import { BlackjackTable } from "@/games/blackjack";

type Props = {
  params: Promise<{ circleId: string }>;
};

const getCircle = cache(async (circleId: string) => {
  const userId = await getLoggedInUserId();
  return prismaClient.circle.getByIdForUser({
    userId,
    circleId,
    select: { id: true, name: true, imageUrl: true },
  });
});

export async function generateMetadata({ params }: Props) {
  const { circleId } = await params;
  const circle = await getCircle(circleId);
  return { title: circle ? `${circle.name} - Blackjack` : DEFAULT_TITLE };
}

export default async function BlackjackPage({ params }: Props) {
  const { circleId } = await params;
  const circle = await getCircle(circleId);

  return circle ? (
    <BlackjackTable
      circleId={circle.id}
      circleName={circle.name}
      circleImageUrl={circle.imageUrl}
    />
  ) : (
    <div className="flex h-dvh w-full">
      <NotFound copy="Circle not found" />
    </div>
  );
}
