import knex from "knex";
import path from "path";
import fs from "node:fs";

declare global {
  var pgClient: undefined | ReturnType<typeof pgClientSingleton>;
}

const pgClientSingleton = () => {
  const ssl =
    process.env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: true,
          ca: fs.readFileSync(path.join(__dirname, process.env.CERT_PATH)),
        }
      : undefined;

  const client = knex({
    client: "pg",
    connection: {
      connectionString: process.env.DATABASE_URL,
      //ssl,
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
