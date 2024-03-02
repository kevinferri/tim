"use server";

import { getLoggedInUserId } from "@/lib/session";
import { z } from "zod";

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
});

export async function createTopic(formData: FormData) {
  const userId = await getLoggedInUserId();
  const validatedFields = createTopicSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    circleId: formData.get("circleId"),
  });

  if (!validatedFields.success || !userId) return false;

  const isInCircle = await prismaClient?.circle.isUserInCirle({
    userId,
    circleId: validatedFields.data.circleId,
  });

  if (!isInCircle) return false;

  const data = await prismaClient?.topic.create({
    data: {
      userId,
      name: validatedFields.data.name,
      description: validatedFields.data.description,
      circleId: validatedFields.data.circleId,
    },
  });

  return {
    data,
  };
}
