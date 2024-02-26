import { prismaClient } from "@/lib/prisma/client";
import Link from "next/link";
import { Routes } from "@/routes";
import { CreateCircleForm } from "@/circles/create-circle-form";

export const CirclesNav = async ({ circleId }: { circleId?: string }) => {
  const circles = await prismaClient.circle.getMeCircles({
    select: {
      id: true,
      name: true,
      defaultTopicId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return (
    <div className="flex flex-col shadow-sm border-r-[1px]">
      <div>
        {circles?.map((g) => {
          const link = g.defaultTopicId
            ? Routes.Topic.replace(":id", g.defaultTopicId)
            : Routes.TopicsForCircle.replace(":id", g.id);

          return (
            <div key={g.id}>
              <Link href={link}>{g.name}</Link>
              {circleId === g.id && "🟢"}
              <hr />
            </div>
          );
        })}
      </div>

      <div className="flex flex-1 justify-center">
        <CreateCircleForm />
      </div>
    </div>
  );
};
