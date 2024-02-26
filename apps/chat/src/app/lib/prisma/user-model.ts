import { prismaClient } from "./client";
import { getLoggedInUserId } from "../session";

export const userModel = {
  async getLoggedIn() {
    const id = await getLoggedInUserId();
    if (!id) return undefined;

    return await prismaClient.user.findUnique({
      where: { id },
    });
  },
};
