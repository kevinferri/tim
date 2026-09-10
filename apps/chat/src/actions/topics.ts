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
      invalid_type_error: "Circle ID required",
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

  if (!validatedFields.success) return false;

  return await prismaClient.topic.upsertForUser({
    userId,
    circleId: validatedFields.data.circleId,
    topicId: validatedFields.data.topicId,
    name: validatedFields.data.name,
    description: validatedFields.data.description,
  });
}

export async function deleteTopic({
  topicId,
  circleId,
}: {
  topicId: string;
  circleId: string;
}) {
  const userId = await getLoggedInUserId();

  return await prismaClient.topic.deleteByIdForUser({
    userId,
    topicId,
    circleId,
  });
}
