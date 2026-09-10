"use server";

import { z } from "zod";

import { prismaClient } from "@/lib/prisma/client";
import { getLoggedInUserId } from "@/lib/session";

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

  const validatedFields = upsertCircleSchema.safeParse({
    name: formData.get("name"),
    circleId: formData.get("circleId"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    members: formData.get("members"),
    defaultTopicName: formData.get("defaultTopicName"),
  });

  if (!validatedFields.success) return false;

  return await prismaClient.circle.upsertForUser({
    userId,
    circleId: validatedFields.data.circleId,
    name: validatedFields.data.name,
    description: validatedFields.data.description,
    imageUrl: validatedFields.data.imageUrl,
    memberEmails: validatedFields.data.members,
    defaultTopicName: validatedFields.data.defaultTopicName,
  });
}

export async function deleteCircle({ circleId }: { circleId: string }) {
  const userId = await getLoggedInUserId();

  return await prismaClient.circle.deleteByIdForUser({ userId, circleId });
}
