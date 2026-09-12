// Seeds local dev data. Since the only real sign-in path is Google OAuth,
// seeded users get a synthetic googleId instead of a real one. "Tim Sandbox"
// is the account the /signin page's dev-only button logs you into via
// GET /api/dev/login?email=<email> (non-production only) -- keep
// TIM_SANDBOX_EMAIL in sync with src/app/signin/page.tsx.
import { randomUUID } from "crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { encrypt } from "@tim/crypto";

const prisma = new PrismaClient();

export const TIM_SANDBOX_EMAIL = "tim.sandbox@example.com";

type SeedUserSpec = {
  googleId: string;
  name: string;
  email: string;
  // Wikipedia article title to pull an avatar photo from (see
  // fetchWikipediaImage). Defaults to the name with spaces -> underscores;
  // pass an explicit title only where that default resolves to the wrong
  // (or a disambiguation) page.
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

// Famous philosophers.
const PHILOSOPHERS = (
  [
    ["Socrates", "socrates"],
    ["Plato", "plato"],
    ["Aristotle", "aristotle"],
    ["Immanuel Kant", "immanuel.kant"],
    ["Friedrich Nietzsche", "friedrich.nietzsche"],
    ["Simone de Beauvoir", "simone.debeauvoir"],
    ["Hannah Arendt", "hannah.arendt"],
    ["Confucius", "confucius"],
    ["Rene Descartes", "rene.descartes", "René_Descartes"],
    ["John Locke", "john.locke"],
    ["Marcus Aurelius", "marcus.aurelius"],
    ["Epictetus", "epictetus"],
    ["Seneca", "seneca", "Seneca_the_Younger"],
    ["Karl Marx", "karl.marx"],
    ["Jean-Paul Sartre", "jeanpaul.sartre"],
    ["Bertrand Russell", "bertrand.russell"],
    ["Arthur Schopenhauer", "arthur.schopenhauer"],
    ["Soren Kierkegaard", "soren.kierkegaard", "Søren_Kierkegaard"],
    ["Albert Camus", "albert.camus"],
  ] satisfies [string, string, string?][]
).map(toSeedUser);

// Wikipedia's REST summary API is public and needs no key -- returns each
// article's lead image, which we use directly as the seeded user's avatar.
// A descriptive User-Agent is required by Wikipedia's API etiquette; a
// missing/renamed article or any network failure just means no avatar for
// that one user, not a failed seed run.
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

// Mirrors the fixed formats apps/realtime-server's command-handler.ts
// produces, so RollResult/EightBallResult render these the same way a real
// command response would.
function articleFor(n: number): "a" | "an" {
  if (n === 8 || n === 11 || n === 18 || (n >= 80 && n < 90)) return "an";
  return "a";
}
const rollResult = (n: number) => `🎲 rolled ${articleFor(n)} ${n}`;
const eightBallResult = (answer: string) => `🎱 ${answer}`;
const photo = (seed: string) => `https://picsum.photos/seed/${seed}/600/400`;
const YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

type MessageSpec = { senderEmail: string; text: string; mediaUrl?: string };
type TopicSpec = { name: string; messages: MessageSpec[] };

type CircleSpec = {
  name: string;
  // Fixed admin (Circle.userId). Omit to pick a random non-Tim-Sandbox
  // member as admin when the circle is first created.
  ownerEmail?: string;
  memberEmails: string[];
  // First topic becomes the circle's default topic.
  topics: TopicSpec[];
};

const CIRCLES: CircleSpec[] = [
  {
    name: "Great Minds",
    ownerEmail: TIM_SANDBOX_EMAIL,
    memberEmails: [...PHILOSOPHERS.map((u) => u.email), TIM_SANDBOX_EMAIL],
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
            senderEmail: "soren.kierkegaard@example.com",
            text: "Anxiety is the dizziness of freedom. Also, unread messages.",
          },
          {
            senderEmail: "marcus.aurelius@example.com",
            text: "Reporting for duty. Or whatever the group chat equivalent is.",
          },
          {
            senderEmail: "confucius@example.com",
            text: "A journey of a thousand messages begins with a single 'hello'.",
          },
          {
            senderEmail: "simone.debeauvoir@example.com",
            text: "One is not born, but rather becomes, a regular in this chat.",
          },
          {
            senderEmail: "plato@example.com",
            text: "The unexamined chat is not worth reading.",
          },
          {
            senderEmail: "karl.marx@example.com",
            text: "Solidarity, comrades. Also, has anyone seen the shared docs?",
          },
          {
            senderEmail: "friedrich.nietzsche@example.com",
            text: "Stared into this chat's abyss. It stared back, mostly memes.",
          },
          {
            senderEmail: "aristotle@example.com",
            text: "Finally made it to the general channel. Someone had to bring the syllogisms.",
          },
          {
            senderEmail: "immanuel.kant@example.com",
            text: "Arrived precisely when I intended to.",
          },
          {
            senderEmail: "rene.descartes@example.com",
            text: "I think, therefore I finally joined this channel.",
          },
          {
            senderEmail: "john.locke@example.com",
            text: "Tabula rasa, but for this specific chat.",
          },
          {
            senderEmail: "jeanpaul.sartre@example.com",
            text: "No exit from this notification badge.",
          },
          {
            senderEmail: "bertrand.russell@example.com",
            text: "Logically, someone had to say hello eventually.",
          },
          {
            senderEmail: "arthur.schopenhauer@example.com",
            text: "I'd rather not be here, but here I am.",
          },
          {
            senderEmail: "albert.camus@example.com",
            text: "The absurd hero also checks notifications.",
          },
          {
            senderEmail: "plato@example.com",
            text: "A shadow of a shadow of an image.",
            mediaUrl: photo("forms"),
          },
          {
            senderEmail: "confucius@example.com",
            text: "Balance in all things, including message frequency.",
          },
          {
            senderEmail: "simone.debeauvoir@example.com",
            text: "One becomes, gradually, over the course of many messages.",
          },
          {
            senderEmail: "hannah.arendt@example.com",
            text: "Some things are better left without images. Just my opinion.",
          },
          {
            senderEmail: "marcus.aurelius@example.com",
            text: "Bore all of this with patience, images or not.",
          },
          {
            senderEmail: "karl.marx@example.com",
            text: "Anyway, has anyone actually seized the means of scheduling yet?",
          },
          {
            senderEmail: "friedrich.nietzsche@example.com",
            text: "One must still have chaos in oneself to give birth to a dancing star. This chat certainly has chaos.",
          },
          {
            senderEmail: "socrates@example.com",
            text: "Another question: why do we have 17 members and only 3 circles?",
          },
          {
            senderEmail: "soren.kierkegaard@example.com",
            text: "/8ball should I read the thread or just reply anyway?",
            mediaUrl: eightBallResult("Better not tell you now."),
          },
          {
            senderEmail: "rene.descartes@example.com",
            text: "Still doubting whether this counts as socializing.",
          },
        ],
      },
      {
        name: "Philosophy of Mind & AI",
        messages: [
          {
            senderEmail: "immanuel.kant@example.com",
            text: "The categorical imperative doesn't care whether you're carbon or silicon.",
          },
          {
            senderEmail: "rene.descartes@example.com",
            text: "If a machine could doubt its own existence, would that settle anything?",
          },
          {
            senderEmail: "john.locke@example.com",
            text: "/giphy blank slate",
            mediaUrl: photo("blankslate"),
          },
          {
            senderEmail: "aristotle@example.com",
            text: "A calculator has no soul, but it does have excellent recall.",
          },
          {
            senderEmail: "hannah.arendt@example.com",
            text: "The banality of an algorithm might be worse than the banality of evil.",
          },
          {
            senderEmail: "bertrand.russell@example.com",
            text: "Machines might compute, but do they doubt? That's the interesting part.",
          },
        ],
      },
      {
        name: "Ethics",
        messages: [
          {
            senderEmail: "aristotle@example.com",
            text: "Virtue is a mean between two vices. Chat etiquette is no different.",
          },
          {
            senderEmail: "albert.camus@example.com",
            text: "One must imagine Sisyphus happy. Or at least caffeinated.",
          },
          {
            senderEmail: "karl.marx@example.com",
            text: "Workers of this chat, unite. Or at least agree on a meeting time.",
          },
          {
            senderEmail: "hannah.arendt@example.com",
            text: "Thoughtlessness is how banal things become dangerous. Read your messages twice.",
          },
          {
            senderEmail: "friedrich.nietzsche@example.com",
            text: "Master morality versus slave morality. Also, who assigned the group project roles?",
          },
        ],
      },
      {
        name: "Free Will & Consciousness",
        messages: [
          {
            senderEmail: "jeanpaul.sartre@example.com",
            text: "We are condemned to be free. Also condemned to this group chat.",
          },
          {
            senderEmail: "friedrich.nietzsche@example.com",
            text: "What doesn't kill this chat makes it stronger.",
          },
          {
            senderEmail: "bertrand.russell@example.com",
            text: "/8ball do we have free will?",
            mediaUrl: eightBallResult("Ask again later."),
          },
          {
            senderEmail: "arthur.schopenhauer@example.com",
            text: "The world is my representation. Also, apparently, my notifications.",
          },
        ],
      },
      {
        name: "Stoicism",
        messages: [
          {
            senderEmail: "marcus.aurelius@example.com",
            text: "This is basically what I do all day. Write things down, hope they help someone.",
          },
          {
            senderEmail: "epictetus@example.com",
            text: "It's not what happens to you, but how you react to it. Also, don't feed the trolls.",
          },
          {
            senderEmail: "seneca@example.com",
            text: "We suffer more in imagination than in reality. Case in point: opening this app.",
          },
          {
            senderEmail: "albert.camus@example.com",
            text: "Sisyphus would have fit right in with you three.",
          },
          {
            senderEmail: "friedrich.nietzsche@example.com",
            text: "/roll d20",
            mediaUrl: rollResult(9),
          },
        ],
      },
    ],
  },
  {
    name: "Philosophers' Corner",
    memberEmails: [...PHILOSOPHERS.map((u) => u.email), TIM_SANDBOX_EMAIL],
    topics: [
      {
        name: "General",
        messages: [
          {
            senderEmail: "socrates@example.com",
            text: "I know that I know nothing. Still checking my messages though.",
          },
          {
            senderEmail: "plato@example.com",
            text: "This chat is but a shadow of the true Chat.",
          },
          {
            senderEmail: "aristotle@example.com",
            text: "Everything in moderation. Except this chat, apparently.",
          },
          {
            senderEmail: "confucius@example.com",
            text: "He who mutes the chat still hears wisdom.",
          },
        ],
      },
      {
        name: "Ethics",
        messages: [
          {
            senderEmail: "immanuel.kant@example.com",
            text: "Always message others as an end, never merely as a means.",
          },
          {
            senderEmail: "simone.debeauvoir@example.com",
            text: "One is not born, but rather becomes, an admin.",
          },
          {
            senderEmail: "hannah.arendt@example.com",
            text: "/tim is evil ever banal?",
            mediaUrl:
              "Arendt's idea of the banality of evil suggests atrocity can come from ordinary, thoughtless bureaucratic behavior rather than only from monstrous intent.",
          },
        ],
      },
      {
        name: "Free Will & Determinism",
        messages: [
          {
            senderEmail: "friedrich.nietzsche@example.com",
            text: "God is dead, but the group chat lives on.",
          },
          {
            senderEmail: "rene.descartes@example.com",
            text: "/8ball do we have free will?",
            mediaUrl: eightBallResult("Reply hazy, try again."),
          },
          {
            senderEmail: "arthur.schopenhauer@example.com",
            text: "The will is free, but its actions are determined. I definitely didn't choose to be this pessimistic.",
          },
        ],
      },
      {
        name: "Epistemology",
        messages: [
          {
            senderEmail: "plato@example.com",
            text: "The cave allegory really holds up as a metaphor for bad wifi.",
          },
          {
            senderEmail: "aristotle@example.com",
            text: "Empirical observation. Still undefeated.",
          },
          {
            senderEmail: "immanuel.kant@example.com",
            text: "/tim can we ever truly know the thing-in-itself?",
            mediaUrl:
              "Kant argued we only ever know *phenomena* (things as they appear to us), never the *noumena* (things as they are in themselves) -- our minds always shape what we perceive.",
          },
          {
            senderEmail: "confucius@example.com",
            text: "Knowing what you know, and knowing what you do not know -- that is knowledge.",
          },
          {
            senderEmail: "bertrand.russell@example.com",
            text: "/youtube here's a solid primer on epistemology",
            mediaUrl: YOUTUBE_URL,
          },
        ],
      },
      {
        name: "Political & Ethical Philosophy",
        messages: [
          {
            senderEmail: "soren.kierkegaard@example.com",
            text: "Life can only be understood backwards but must be lived forwards. Also, scroll up.",
          },
          {
            senderEmail: "albert.camus@example.com",
            text: "The struggle itself toward the inbox is enough to fill a man's heart.",
          },
          {
            senderEmail: "karl.marx@example.com",
            text: "From each according to their typing speed, to each according to their need for memes.",
          },
          {
            senderEmail: "jeanpaul.sartre@example.com",
            text: "Existence precedes essence. Also, I mostly exist to argue in this thread.",
          },
          {
            senderEmail: "bertrand.russell@example.com",
            text: "The trouble with the world is that the foolish are cocksure and the wise are full of doubt. Also, who read the pinned message?",
          },
          {
            senderEmail: "marcus.aurelius@example.com",
            text: "You have power over your mind, not outside events. Definitely not over notification badges.",
          },
          {
            senderEmail: "friedrich.nietzsche@example.com",
            text: "The will to power explains most of this thread, honestly.",
          },
        ],
      },
    ],
  },
  {
    name: "Tim's Sandbox",
    ownerEmail: TIM_SANDBOX_EMAIL,
    memberEmails: [TIM_SANDBOX_EMAIL],
    topics: [
      {
        name: "General",
        messages: [
          {
            senderEmail: TIM_SANDBOX_EMAIL,
            text: "Just me testing things in here.",
          },
          {
            senderEmail: TIM_SANDBOX_EMAIL,
            text: "/roll d20",
            mediaUrl: rollResult(11),
          },
          {
            senderEmail: TIM_SANDBOX_EMAIL,
            text: "/8ball does this feature work?",
            mediaUrl: eightBallResult("Signs point to yes."),
          },
        ],
      },
      {
        name: "Command Testing",
        messages: [
          {
            senderEmail: TIM_SANDBOX_EMAIL,
            text: "/giphy testing",
            mediaUrl: photo("timtest"),
          },
          {
            senderEmail: TIM_SANDBOX_EMAIL,
            text: "/youtube",
            mediaUrl: YOUTUBE_URL,
          },
          {
            senderEmail: TIM_SANDBOX_EMAIL,
            text: "/tim what's 2 + 2?",
            mediaUrl: "2 + 2 is **4**.",
          },
        ],
      },
      {
        name: "Random Testing",
        messages: [
          {
            senderEmail: TIM_SANDBOX_EMAIL,
            text: "/roll d100",
            mediaUrl: rollResult(42),
          },
          {
            senderEmail: TIM_SANDBOX_EMAIL,
            text: "/8ball is this seed data good enough?",
            mediaUrl: eightBallResult("It is certain."),
          },
          {
            senderEmail: TIM_SANDBOX_EMAIL,
            text: "One more for good measure.",
          },
        ],
      },
    ],
  },
];

function pickRandomOwner(memberEmails: string[]): string {
  const candidates = memberEmails.filter((email) => email !== TIM_SANDBOX_EMAIL);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

async function seedCircle(
  tx: Prisma.TransactionClient,
  spec: CircleSpec,
  usersByEmail: Map<string, { id: string }>,
  // Index within CIRCLES, used to derive a deterministic createdAt so the
  // sidebar (ordered by createdAt asc) always lists circles in CIRCLES'
  // order -- regardless of the wall-clock order they actually got created
  // or backfilled in across repeated seed runs.
  circleIndex: number,
) {
  const getId = (email: string) => usersByEmail.get(email)!.id;
  const memberIds = Array.from(new Set(spec.memberEmails)).map((email) => ({
    id: getId(email),
  }));
  const createdAt = new Date(Date.now() - (CIRCLES.length - circleIndex) * 60 * 1000);

  // Looked up by name alone (not name+owner) so re-running after changing an
  // admin, or randomizing one, still finds and backfills the same circle
  // instead of creating a duplicate.
  const existing = await tx.circle.findFirst({ where: { name: spec.name } });

  if (existing) {
    // `connect` is additive, so this never drops existing members. createdAt
    // is re-stamped too, so ordering self-heals even if circles were seeded
    // out of order in a prior run.
    await tx.circle.update({
      where: { id: existing.id },
      data: { members: { connect: memberIds }, createdAt },
    });
    return;
  }

  const ownerEmail = spec.ownerEmail ?? pickRandomOwner(spec.memberEmails);
  const ownerId = getId(ownerEmail);

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

    // Mirrors topicModel.upsertForUser's real side effect on topic creation
    // (src/lib/prisma/topic-model.ts): every current member gets a
    // TopicHistory row, i.e. "caught up as of now". Skip Tim Sandbox so his
    // first login still lands on the fresh "Welcome to Tim" screen instead
    // of auto-redirecting into whichever topic has the newest history row.
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
  const allUsers = [TIM_SANDBOX, ...PHILOSOPHERS];

  const users = await Promise.all(
    allUsers.map((user) =>
      prisma.user.upsert({
        where: { googleId: user.googleId },
        update: {},
        create: { googleId: user.googleId, name: user.name, email: user.email },
      }),
    ),
  );

  // Sequential, not Promise.all: one at a time is kinder to Wikipedia's API
  // and this only ever runs once per user (skipped below once imageUrl is set).
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

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
