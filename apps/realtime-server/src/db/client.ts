import knex from "knex";

const pgClientSingleton = () => {
  const client = knex({
    client: "pg",
    connection: process.env.DATABASE_URL,
    searchPath: ["knex", "public"],
    useNullAsDefault: true,
  });

  return client;
};

declare global {
  var pgClient: undefined | ReturnType<typeof pgClientSingleton>;
}

const pgClient = globalThis.pgClient ?? pgClientSingleton();

export { pgClient };

if (process.env.NODE_ENV !== "production") globalThis.pgClient = pgClient;
