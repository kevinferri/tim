const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const { spawn } = require("child_process");
const { Client } = require("pg");

const DATABASE_DIR = path.join(__dirname, "..", ".pgdata");
const LOG_FILE = path.join(DATABASE_DIR, "postgres.log");
const PORT = 5432;
const USER = "postgres";
const PASSWORD = "postgres";
const DB_NAME = "tim";

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

async function main() {
  if (await isPortOpen(PORT)) {
    return;
  }

  const { pg_ctl } = await resolveBinaries();
  const isFirstRun = !fs.existsSync(DATABASE_DIR);

  if (isFirstRun) {
    // embedded-postgres's own initialise() handles initdb, auth config,
    // and pg_hba.conf correctly -- only its start() (below, deliberately
    // avoided) ties the server to this process's lifetime.
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

  // Start Postgres as a fully detached daemon via pg_ctl directly, so it
  // survives this script exiting and isn't tied to the parent's process
  // group/terminal session (unlike embedded-postgres's own start()).
  const pgCtl = spawn(
    pg_ctl,
    ["-D", DATABASE_DIR, "-l", LOG_FILE, "-o", `-p ${PORT}`, "-w", "start"],
    { detached: true, stdio: "ignore" },
  );
  pgCtl.unref();

  await waitForPort(PORT);
  await ensureDatabase();

  console.log(`Postgres ready on port ${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
