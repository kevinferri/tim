"use server";

import { z } from "zod";
import { DISPLAY_NAME_MAX_LENGTH } from "@tim/user-display";

import { prismaClient } from "@/lib/prisma/client";
import { uploadImage } from "@/lib/cloudinary";
import { getLoggedInUserId } from "@/lib/session";

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(DISPLAY_NAME_MAX_LENGTH),
  // The cropped avatar as a data URL; uploaded here rather than by the client
  // so imageUrl can only ever point at something this server uploaded.
  avatar: z.string().startsWith("data:image/").optional(),
});

export async function updateProfile(args: z.input<typeof updateProfileSchema>) {
  const userId = await getLoggedInUserId();
  if (!userId) return false;

  const validatedFields = updateProfileSchema.safeParse(args);
  if (!validatedFields.success) return false;

  let imageUrl: string | undefined;
  if (validatedFields.data.avatar) {
    const upload = await uploadImage(validatedFields.data.avatar);
    if (!upload) return false;
    imageUrl = upload.secure_url;
  }

  return await prismaClient.user.updateProfile({
    userId,
    displayName: validatedFields.data.displayName,
    imageUrl,
  });
}
