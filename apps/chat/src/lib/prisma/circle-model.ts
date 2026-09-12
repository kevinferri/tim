import { prismaClient } from "@/lib/prisma/client";
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

export const circleModel = {
  async getForUser({
    userId,
    select,
    orderBy,
  }: {
    userId?: string;
    select: Prisma.CircleSelect;
    orderBy?: Prisma.CircleOrderByWithRelationInput;
  }) {
    if (!userId) return undefined;

    return prismaClient.circle.findMany({
      orderBy,
      select,
      where: {
        members: {
          some: {
            id: userId,
          },
        },
      },
    });
  },

  async getByIdForUser({
    userId,
    circleId,
    select,
  }: {
    userId?: string;
    circleId?: string;
    select: Prisma.CircleSelect;
  }) {
    if (!userId) return undefined;

    return await prismaClient.circle.findUnique({
      where: {
        id: circleId,
        members: {
          some: {
            id: userId,
          },
        },
      },
      select,
    });
  },

  // Duplicates the membership check in apps/realtime-server/src/db/circles.ts's isUserInCircle -- if circle-membership semantics change in schema.prisma, update both.
  async isUserInCircle({
    circleId,
    userId,
  }: {
    circleId?: string;
    userId?: string;
  }) {
    if (!userId || !circleId) return false;

    const foundCircle = await prismaClient.circle.findUnique({
      where: {
        id: circleId,
        members: {
          some: {
            id: userId,
          },
        },
      },
      select: { id: true },
    });

    return Boolean(foundCircle);
  },

  async upsertForUser({
    userId,
    circleId,
    name,
    description,
    imageUrl,
    memberEmails,
    defaultTopicName,
  }: {
    userId?: string;
    circleId: string | null;
    name: string;
    description: string | null;
    imageUrl: string | null;
    memberEmails: string | null;
    defaultTopicName: string | null;
  }) {
    if (!userId) return false;

    const existingCircle = circleId
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

    if (existingCircle && existingCircle.userId !== userId) return false;

    // `email: { in: undefined }` is Prisma's "no filter," not "match nothing" -- guard explicitly or an empty/absent memberEmails would match every user in the database.
    const members = memberEmails
      ? await prismaClient.user.findMany({
          where: {
            email: {
              in: memberEmails.split(", "),
            },
          },
          select: { id: true },
        })
      : [];

    let newCircle: Partial<CircleWithRelations> = {};
    let defaultTopic: Partial<Topic> = {};

    try {
      await prismaClient.$transaction(async (tx) => {
        const data = {
          userId,
          name,
          description,
          imageUrl,

          members: {
            connect: [{ id: userId }, ...members],
          },
        };

        if (existingCircle) {
          // Prisma's `connect` only adds, so members must be cleared first to fully replace the set.
          await tx.circle.update({
            where: { id: existingCircle.id },
            data: { members: { set: [] } },
          });

          newCircle = await tx.circle.update({
            where: { id: existingCircle.id },
            data,
            select: CIRCLE_SELECT,
          });
        } else {
          newCircle = await tx.circle.create({
            data,
            select: CIRCLE_SELECT,
          });
        }

        if (!existingCircle && newCircle.id) {
          defaultTopic = await tx.topic.create({
            data: {
              userId,
              name: defaultTopicName ?? "General",
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
        defaultTopicId: defaultTopic?.id ?? existingCircle?.defaultTopicId,
      },
    };
  },

  async deleteByIdForUser({
    userId,
    circleId,
  }: {
    userId?: string;
    circleId: string;
  }) {
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
  },
};
