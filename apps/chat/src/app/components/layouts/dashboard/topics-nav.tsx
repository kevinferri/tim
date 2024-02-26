import { prismaClient } from "@/lib/prisma/client";

export async function TopicsNav({
  circleId,
  topicId,
}: {
  circleId: string;
  topicId?: string;
}) {
  const topics = await prismaClient.topic.getMeAllTopicsForCircle({
    circleId,
    select: {
      name: true,
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return (
    <div className="flex flex-col shadow-sm border-r-[1px]">
      {topics ? (
        <>
          <p>Topics</p>
          <br />

          {topics.map((topic) => {
            return (
              <div key={topic.id}>
                #{topic.name.toLowerCase()}
                {topicId === topic.id && "🟢"}
                <hr />
              </div>
            );
          })}
        </>
      ) : (
        "No topics yet..."
      )}
    </div>
  );
}
