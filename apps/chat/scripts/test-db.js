// Embedded Postgres instance dedicated to tests, kept entirely separate from
// the dev database started by scripts/db.js (different port/data dir/db
// name, so `yarn test` and `yarn dev` can run at the same time).
//
// Schema is applied via `prisma db push` against apps/chat/prisma/schema.prisma
// on every call, since that's the single source of truth both apps' tests
// rely on (see root CLAUDE.md).
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const { spawn, execSync } = require("child_process");
const { Client } = require("pg");

const CHAT_DIR = path.join(__dirname, "..");
const DATABASE_DIR = path.join(CHAT_DIR, ".pgdata-test");
const LOG_FILE = path.join(DATABASE_DIR, "postgres.log");
const PORT = 5433;
const USER = "postgres";
const PASSWORD = "postgres";
const DB_NAME = "tim_test";

const DATABASE_URL = `postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DB_NAME}`;

// Matches embedded-postgres/dist/binary.js -- these packages are ESM-only,
// hence the dynamic import() below.
const BINARY_PACKAGES = {
  darwin: {
    arm64: "@embedded-postgres/darwin-arm64",
    x64: "@embedded-postgres/darwin-x64",
  },
  linux: {
    arm64: "@embedded-postgres/linux-arm64",
    arm: "@embedded-postgres/linux-arm",
    ia32: "@embedded-postgres/linux-ia32",
    ppc64: "@embedded-postgres/linux-ppc64",
    x64: "@embedded-postgres/linux-x64",
  },
  win32: {
    x64: "@embedded-postgres/windows-x64",
  },
};

async function resolveBinaries() {
  const pkg = BINARY_PACKAGES[os.platform()]?.[os.arch()];

  if (!pkg) {
    throw new Error(
      `Unsupported platform/arch for embedded postgres: ${os.platform()}/${os.arch()}`,
    );
  }

  // A bare `import(pkg)` from this file fails under pnpm: these platform
  // packages are optional dependencies of embedded-postgres itself, not of
  // this project, so pnpm's isolated node_modules never exposes them to
  // anything outside embedded-postgres's own install tree (this is what
  // changed in the yarn-v1 -> pnpm migration; yarn's flat node_modules
  // happened to hoist them within reach). embedded-postgres/dist/binary.js
  // resolves the same bare specifier successfully because it runs from
  // inside that tree -- so resolve `pkg` starting from embedded-postgres's
  // own location instead of this script's, then import the resolved path.
  const embeddedPostgresEntry = require.resolve("embedded-postgres");
  const resolvedPkgPath = require.resolve(pkg, {
    paths: [path.dirname(embeddedPostgresEntry)],
  });

  return import(pathToFileURL(resolvedPkgPath).href);
}

function isPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function waitForPort(port, timeoutMs = 15000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(
    `Postgres did not become ready on port ${port} within ${timeoutMs}ms`,
  );
}

async function ensureDatabase() {
  const client = new Client({
    host: "127.0.0.1",
    port: PORT,
    user: USER,
    password: PASSWORD,
    database: "postgres",
  });

  await client.connect();

  const { rowCount } = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [DB_NAME],
  );

  if (rowCount === 0) {
    await client.query(`CREATE DATABASE "${DB_NAME}"`);
    console.log(`Created database "${DB_NAME}"`);
  }

  await client.end();
}

async function ensurePostgresRunning() {
  if (await isPortOpen(PORT)) return;

  const { pg_ctl } = await resolveBinaries();
  const isFirstRun = !fs.existsSync(DATABASE_DIR);

  if (isFirstRun) {
    const EmbeddedPostgres = require("embedded-postgres").default;
    const pg = new EmbeddedPostgres({
      databaseDir: DATABASE_DIR,
      port: PORT,
      user: USER,
      password: PASSWORD,
      persistent: true,
    });
    await pg.initialise();
  }

  // Detached daemon, same rationale as scripts/db.js: survives this
  // process exiting, isn't tied to the test runner's process group.
  const pgCtl = spawn(
    pg_ctl,
    ["-D", DATABASE_DIR, "-l", LOG_FILE, "-o", `-p ${PORT}`, "-w", "start"],
    { detached: true, stdio: "ignore" },
  );
  pgCtl.unref();

  await waitForPort(PORT);
  await ensureDatabase();
}

function pushSchema() {
  execSync(
    "npx prisma db push --schema=./prisma/schema.prisma --skip-generate --accept-data-loss",
    {
      cwd: CHAT_DIR,
      env: { ...process.env, DATABASE_URL },
      stdio: process.env.DEBUG_TEST_DB ? "inherit" : "pipe",
    },
  );
}

async function ensureTestDb() {
  await ensurePostgresRunning();
  pushSchema();
  return DATABASE_URL;
}

module.exports = { ensureTestDb, DATABASE_URL, PORT, DB_NAME };

if (require.main === module) {
  ensureTestDb()
    .then((url) => console.log(`Test Postgres ready on port ${PORT}: ${url}`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
