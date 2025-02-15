import { prismaClient } from "@/lib/prisma/client";
import { getLoggedInUserId } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const userId = await getLoggedInUserId();
  // const mostRecentTopic = await prismaClient.topicHistory.findFirst({
  //   orderBy: {
  //     createdAt: "desc",
  //   },
  //   where: {
  //     userId,
  //   },
  //   select: {
  //     id: true,
  //     topicId: true,
  //     topic: {
  //       select: {
  //         circleId: true,
  //         parentCircle: {
  //           select: {
  //             id: true,
  //             members: {
  //               select: {
  //                 id: true,
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //   },
  // });

  // const isStillInCircle = mostRecentTopic?.topic.parentCircle.members.find(
  //   ({ id }) => id === userId
  // );

  // if (
  //   mostRecentTopic?.topicId &&
  //   mostRecentTopic?.topic.circleId &&
  //   isStillInCircle
  // ) {
  //   redirect(
  //     `/circles/${mostRecentTopic.topic.circleId}/topics/${mostRecentTopic?.topicId}`
  //   );
  // }

  // if (mostRecentTopic && !isStillInCircle) {
  //   prismaClient.topicHistory.deleteMany({
  //     where: {
  //       topicId: mostRecentTopic.id,
  //       userId,
  //     },
  //   });
  // }

  return (
    <div className="flex basis-full justify-center items-center">
      Welcome to Tim
    </div>
  );
}
