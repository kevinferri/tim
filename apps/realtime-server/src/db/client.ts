import knex from "knex";

declare global {
  var pgClient: undefined | ReturnType<typeof pgClientSingleton>;
}

const ssl =
  process.env.NODE_ENV === "production"
    ? {
        ca: Buffer.from(process.env.DATABASE_SSL_CERT, "base64").toString(
          "utf-8"
        ),
        rejectUnauthorized: true,
      }
    : undefined;

const pgClientSingleton = () => {
  const client = knex({
    client: "pg",
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl,
    },
    searchPath: ["knex", "public"],
    useNullAsDefault: true,
  });

  return client;
};

const pgClient = globalThis.pgClient ?? pgClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.pgClient = pgClient;
}

export { pgClient };

process.on("SIGTERM", async () => {
  if (pgClient) {
    await pgClient.destroy();
  }
  process.exit(0);
});
