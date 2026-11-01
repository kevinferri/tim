"use server";

import { z } from "zod";
import { DISPLAY_NAME_MAX_LENGTH } from "@tim/user-display";

import { prismaClient } from "@/lib/prisma/client";
import { uploadImage } from "@/lib/cloudinary";
import { getLoggedInUserId } from "@/lib/session";

// The client sends a 512px JPEG (well under 1 MB); the cap keeps oversized payloads off Cloudinary.
const MAX_AVATAR_DATA_URL_LENGTH = 2 * 1024 * 1024;

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(DISPLAY_NAME_MAX_LENGTH),
  // The cropped avatar as a data URL; uploaded here rather than by the client
  // so imageUrl can only ever point at something this server uploaded.
  avatar: z
    .string()
    .max(MAX_AVATAR_DATA_URL_LENGTH)
    .regex(/^data:image\/(jpeg|png|webp);base64,/)
    .optional(),
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
