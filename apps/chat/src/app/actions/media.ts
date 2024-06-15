"use server";

import { uploadImage } from "@/lib/cloudinary";
import { getLoggedInUserId } from "@/lib/session";

type Args = {
  file: string;
};

export async function uploadMedia({ file }: Args) {
  const userId = await getLoggedInUserId();
  if (!userId) return false;
  const mediaUpload = await uploadImage(file);
  return {
    mediaUrl: mediaUpload?.secure_url,
  };
}
