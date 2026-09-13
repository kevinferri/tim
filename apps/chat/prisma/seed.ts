// Seeds local dev data; "Tim Sandbox" is the account /signin's dev-only button logs into.
import { randomUUID } from "crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { encrypt } from "@tim/crypto";
import { TIM_SANDBOX_EMAIL } from "./seed-constants";

const prisma = new PrismaClient();

type SeedUserSpec = {
  googleId: string;
  name: string;
  email: string;
  // Wikipedia article to pull an avatar from; defaults to name with "_" for spaces.
  wikiTitle?: string;
};

const TIM_SANDBOX: SeedUserSpec = {
  googleId: "seed-tim-sandbox",
  name: "Tim Sandbox",
  email: TIM_SANDBOX_EMAIL,
};

const toSeedUser = ([name, slug, wikiTitle]: [
  string,
  string,
  string?,
]): SeedUserSpec => ({
  googleId: `seed-${slug}`,
  name,
  email: `${slug}@example.com`,
  wikiTitle: wikiTitle ?? name.replace(/ /g, "_"),
});

const OTHER_USERS = (
  [
    ["Socrates", "socrates"],
    ["Simone de Beauvoir", "simone.debeauvoir"],
    ["Marcus Aurelius", "marcus.aurelius"],
    ["Confucius", "confucius"],
  ] satisfies [string, string, string?][]
).map(toSeedUser);

// Wikipedia's public REST API; a missing article or network failure just skips that avatar.
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWikipediaImage(title: string): Promise<string | undefined> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        {
          headers: {
            "User-Agent":
              "tim-app-dev-seed-script/1.0 (local development seed data, not production traffic)",
          },
        },
      );

      if (res.status === 429) {
        await sleep(2000);
        continue;
      }
      if (!res.ok) return undefined;

      const data = (await res.json()) as { thumbnail?: { source?: string } };
      return data.thumbnail?.source;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

// Mirrors apps/realtime-server's command-handler.ts output format.
function articleFor(n: number): "a" | "an" {
  if (n === 8 || n === 11 || n === 18 || (n >= 80 && n < 90)) return "an";
  return "a";
}
const rollResult = (n: number) => `🎲 rolled ${articleFor(n)} ${n}`;
const eightBallResult = (answer: string) => `🎱 ${answer}`;
const photo = (seed: string) => `https://picsum.photos/seed/${seed}/600/400`;

type MessageSpec = { senderEmail: string; text: string; mediaUrl?: string };
type TopicSpec = { name: string; messages: MessageSpec[] };

type CircleSpec = {
  name: string;
  ownerEmail: string;
  memberEmails: string[];
  topics: TopicSpec[]; // first topic becomes the circle's default topic
};

const CIRCLES: CircleSpec[] = [
  {
    name: "Great Minds",
    ownerEmail: TIM_SANDBOX_EMAIL,
    memberEmails: [
      TIM_SANDBOX_EMAIL,
      "socrates@example.com",
      "simone.debeauvoir@example.com",
      "marcus.aurelius@example.com",
      "confucius@example.com",
    ],
    topics: [
      {
        name: "General",
        messages: [
          {
            senderEmail: TIM_SANDBOX_EMAIL,
            text: "Alright, I'm running things now. Try not to break anything.",
          },
          {
            senderEmail: "socrates@example.com",
            text: "I know that I know nothing. Figured I'd bring that energy here too.",
          },
          {
            senderEmail: "simone.debeauvoir@example.com",
            text: "One is not born, but rather becomes, a regular in this chat.",
            mediaUrl: photo("existence"),
          },
          {
            senderEmail: "socrates@example.com",
            text: "/roll d20",
            mediaUrl: rollResult(17),
          },
          {
            senderEmail: "marcus.aurelius@example.com",
            text: "Reporting for duty. Or whatever the group chat equivalent is.",
          },
        ],
      },
      {
        name: "Ethics",
        messages: [
          {
            senderEmail: "simone.debeauvoir@example.com",
            text: "One is not born, but rather becomes, a good admin.",
          },
          {
            senderEmail: "socrates@example.com",
            text: "/8ball is the unexamined life really not worth living?",
            mediaUrl: eightBallResult("Without a doubt."),
          },
          {
            senderEmail: "confucius@example.com",
            text: "He who mutes the chat still hears wisdom.",
          },
          {
            senderEmail: TIM_SANDBOX_EMAIL,
            text: "Noted. Circling back to this later.",
          },
        ],
      },
    ],
  },
];

async function seedCircle(
  tx: Prisma.TransactionClient,
  spec: CircleSpec,
  usersByEmail: Map<string, { id: string }>,
  circleIndex: number, // fixes sidebar order (by createdAt) to match CIRCLES
) {
  const getId = (email: string) => usersByEmail.get(email)!.id;
  const memberIds = Array.from(new Set(spec.memberEmails)).map((email) => ({
    id: getId(email),
  }));
  const createdAt = new Date(
    Date.now() - (CIRCLES.length - circleIndex) * 60 * 1000,
  );

  // Looked up by name only, so reruns find and backfill the same circle.
  const existing = await tx.circle.findFirst({ where: { name: spec.name } });

  if (existing) {
    // Skip circles this script didn't create (name collision with a real one).
    const seedUserIds = new Set([...usersByEmail.values()].map((u) => u.id));
    if (!seedUserIds.has(existing.userId)) {
      console.warn(`Skipping "${spec.name}": not owned by a seed user.`);
      return;
    }

    await tx.circle.update({
      where: { id: existing.id },
      data: { members: { connect: memberIds }, createdAt },
    });
    return;
  }

  const ownerId = getId(spec.ownerEmail);

  const circle = await tx.circle.create({
    data: {
      name: spec.name,
      userId: ownerId,
      members: { connect: memberIds },
      createdAt,
    },
  });

  for (const [index, topicSpec] of spec.topics.entries()) {
    const topic = await tx.topic.create({
      data: {
        name: topicSpec.name,
        userId: ownerId,
        circleId: circle.id,
        ...(index === 0 && {
          defaultForCircle: { connect: { id: circle.id } },
        }),
      },
    });

    const now = Date.now();
    await tx.message.createMany({
      data: topicSpec.messages.map((m, i) => {
        const id = randomUUID();
        return {
          id,
          text: encrypt(m.text, id),
          mediaUrl: m.mediaUrl,
          userId: getId(m.senderEmail),
          topicId: topic.id,
          createdAt: new Date(
            now - (topicSpec.messages.length - i) * 2 * 60 * 1000,
          ),
        };
      }),
    });

    // Excludes Tim Sandbox so his first login still lands on "Welcome to Tim".
    const historyUserIds = memberIds
      .map((m) => m.id)
      .filter((id) => id !== getId(TIM_SANDBOX_EMAIL));

    if (historyUserIds.length) {
      await tx.topicHistory.createMany({
        data: historyUserIds.map((userId) => ({ topicId: topic.id, userId })),
        skipDuplicates: true,
      });
    }
  }
}

async function main() {
  const allUsers = [TIM_SANDBOX, ...OTHER_USERS];

  const users = await Promise.all(
    allUsers.map((user) =>
      prisma.user.upsert({
        where: { googleId: user.googleId },
        update: {},
        create: { googleId: user.googleId, name: user.name, email: user.email },
      }),
    ),
  );

  // Sequential (not Promise.all) to be kind to Wikipedia's API.
  let avatarsFetched = 0;
  for (const [i, user] of users.entries()) {
    const spec = allUsers[i];
    if (user.imageUrl || !spec.wikiTitle) continue;

    const imageUrl = await fetchWikipediaImage(spec.wikiTitle);
    if (imageUrl) {
      await prisma.user.update({ where: { id: user.id }, data: { imageUrl } });
      avatarsFetched++;
    }
    await sleep(300);
  }

  const usersByEmail = new Map(users.map((u) => [u.email!, u]));

  await prisma.$transaction(async (tx) => {
    for (const [circleIndex, circleSpec] of CIRCLES.entries()) {
      await seedCircle(tx, circleSpec, usersByEmail, circleIndex);
    }
  });

  console.log(
    `Seeded ${users.length} users (${avatarsFetched} new avatars fetched) and ${CIRCLES.length} circles.`,
  );
  console.log(`Log in as Tim Sandbox locally via the /signin page.`);
}

// Guards against running (and hitting a real DB/Wikipedia) on import for tests.
if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedCircle };
