"use server";

import { z } from "zod";

import { prismaClient } from "@/lib/prisma/client";
import { getLoggedInUserId } from "@/lib/session";
import { Prisma, Topic } from "@prisma/client";

const CIRCLE_SELECT = {
  id: true,
  imageUrl: true,
  name: true,
  createdBy: {
    select: {
      id: true,
      name: true,
    },
  },
  members: {
    select: {
      id: true,
    },
  },
} as const;

type CircleWithRelations = Prisma.CircleGetPayload<{
  include: typeof CIRCLE_SELECT;
}>;

const upsertCircleSchema = z.object({
  name: z
    .string({
      invalid_type_error: "Circle name required",
    })
    .min(1),
  circleId: z.string().nullable(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  members: z.string().nullable(),
  defaultTopicName: z.string().nullable(),
});

export async function upsertCircle(formData: FormData) {
  const userId = await getLoggedInUserId();
  if (!userId) return false;

  const validatedFields = upsertCircleSchema.safeParse({
    name: formData.get("name"),
    circleId: formData.get("circleId"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    members: formData.get("members"),
    defaultTopicName: formData.get("defaultTopicName"),
  });

  if (!validatedFields.success) return false;

  const circleId = validatedFields.data.circleId;
  const existingCirle = circleId
    ? await prismaClient.circle.findUnique({
        where: {
          id: circleId,
        },
        select: {
          id: true,
          userId: true,
          defaultTopicId: true,
        },
      })
    : undefined;

  // Make sure cur user is creator of current circle
  if (existingCirle && existingCirle.userId !== userId) return false;

  const members = await prismaClient.user.findMany({
    where: {
      email: {
        in: validatedFields.data.members?.split(", "),
      },
    },
    select: { id: true },
  });

  let newCircle: Partial<CircleWithRelations> = {};
  let defaultTopic: Partial<Topic> = {};

  try {
    const where = { id: circleId ?? undefined };

    await prismaClient.$transaction(async () => {
      if (existingCirle) {
        // Remove existing members to be updated with new payload
        await prismaClient.circle.update({
          where,
          data: { members: { set: [] } },
        });
      }

      const data = {
        userId,
        name: validatedFields.data.name,
        description: validatedFields.data.description,
        imageUrl: validatedFields.data.imageUrl,

        members: {
          connect: [{ id: userId }, ...members],
        },
      };

      newCircle = await prismaClient.circle.upsert({
        where,
        create: data,
        update: data,
        select: CIRCLE_SELECT,
      });

      // Create default topic on circle creation
      if (!existingCirle && newCircle.id) {
        defaultTopic = await prismaClient.topic.create({
          data: {
            userId,
            name: validatedFields.data.defaultTopicName ?? "General",
            circleId: newCircle.id,
            defaultForCircle: {
              connect: { id: newCircle.id },
            },
          },
          select: { id: true },
        });
      }
    });
  } catch (err) {
    return false;
  }

  return {
    data: {
      ...newCircle,
      defaultTopicId: defaultTopic?.id ?? existingCirle?.defaultTopicId,
    },
  };
}

export async function deleteCircle({ circleId }: { circleId: string }) {
  const userId = await getLoggedInUserId();
  if (!userId || !circleId) return false;

  const circle = await prismaClient.circle.findUnique({
    where: {
      id: circleId,
      userId,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!circle || circle.userId !== userId) return false;

  const data = await prismaClient.circle.delete({
    where: {
      id: circleId,
    },
    select: {
      id: true,
      name: true,
      members: {
        select: {
          id: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return { data };
}
