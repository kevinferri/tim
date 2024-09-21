"use server";

import { z } from "zod";

import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";

const createTopicSchema = z.object({
  name: z
    .string({
      invalid_type_error: "Topic name required",
    })
    .min(1),
  circleId: z
    .string({
      invalid_type_error: "Topic name required",
    })
    .min(1),
  description: z.string().nullable(),
  topicId: z.string().nullable(),
});

export async function upsertTopic(formData: FormData) {
  const userId = await getLoggedInUserId();

  const validatedFields = createTopicSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    circleId: formData.get("circleId"),
    topicId: formData.get("topicId"),
  });

  if (!validatedFields.success || !userId) return false;

  const circleId = validatedFields.data.circleId;
  const topicId = validatedFields.data.topicId;

  const isInCircle = await prismaClient.circle.isUserInCirle({
    userId,
    circleId,
  });

  if (!isInCircle) return false;

  const existingTopic = topicId
    ? await prismaClient.topic.findUnique({
        where: {
          id: topicId,
          circleId,
        },
        select: {
          id: true,
          userId: true,
        },
      })
    : undefined;

  // Make sure cur user is creator of current topic
  if (existingTopic && existingTopic.userId !== userId) return false;

  const payload = {
    userId,
    circleId,
    name: validatedFields.data.name,
    description: validatedFields.data.description,
  };

  const data = await prismaClient.topic.upsert({
    where: {
      id: topicId ?? undefined,
    },
    create: payload,
    update: payload,
    select: {
      id: true,
      name: true,
      circleId: true,
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // If new topic, create histories for members
  if (!existingTopic) {
    const circleMembers = await prismaClient.circle.findUnique({
      where: {
        id: data.circleId,
      },
      select: {
        members: {
          select: { id: true },
        },
      },
    });

    const historiesPayload = circleMembers?.members.map((member) => {
      return {
        topicId: data.id,
        userId: member.id,
      };
    });

    if (historiesPayload) {
      await prismaClient.topicHistory.createMany({
        data: historiesPayload,
        skipDuplicates: true,
      });
    }
  }

  return {
    data,
  };
}

export async function deleteTopic({ topicId }: { topicId: string }) {
  const userId = await getLoggedInUserId();
  if (!userId || !topicId) return false;

  const topic = await prismaClient.topic.getMeTopicById({
    topicId,
    select: {
      id: true,
      userId: true,
      parentCircle: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!topic) return false;

  const isInCircle = await prismaClient.circle.isUserInCirle({
    userId,
    circleId: topic?.parentCircle.id,
  });

  if (!isInCircle || topic.userId !== userId) return false;

  const data = await prismaClient.topic.delete({
    where: {
      id: topicId,
    },
    select: {
      id: true,
      name: true,
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
      parentCircle: {
        select: {
          id: true,
        },
      },
    },
  });

  return {
    data,
  };
}
