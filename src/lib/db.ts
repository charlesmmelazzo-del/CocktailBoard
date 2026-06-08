import { Pool } from "pg";

// A single shared connection pool. In dev, Next.js hot-reloads modules, so we
// stash the pool on globalThis to avoid opening a new pool on every reload.
const globalForDb = globalThis as unknown as {
  _pgPool?: Pool;
  _dbReady?: Promise<void>;
};

function makePool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. On Railway, add a Postgres database to the project; locally, copy .env.example to .env and fill it in.",
    );
  }

  // Railway's internal connection (host ends in .railway.internal) and local
  // Postgres don't use SSL. Public/proxied connections do.
  const needsSsl =
    !connectionString.includes(".railway.internal") &&
    !connectionString.includes("localhost") &&
    !connectionString.includes("127.0.0.1");

  return new Pool({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
    max: 5,
  });
}

export function pool(): Pool {
  if (!globalForDb._pgPool) {
    globalForDb._pgPool = makePool();
  }
  return globalForDb._pgPool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add the admin flag to databases created before this column existed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cocktails (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  recipe       TEXT NOT NULL DEFAULT '',
  base_spirit  TEXT NOT NULL DEFAULT 'other',
  base_spirits TEXT[] NOT NULL DEFAULT '{}',
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A cocktail can have more than one base spirit (split bases). Add the array
-- column to older databases and seed it from the single base_spirit value.
ALTER TABLE cocktails ADD COLUMN IF NOT EXISTS base_spirits TEXT[] NOT NULL DEFAULT '{}';
UPDATE cocktails SET base_spirits = ARRAY[base_spirit]
  WHERE cardinality(base_spirits) = 0 AND base_spirit IS NOT NULL;

CREATE TABLE IF NOT EXISTS placements (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cocktail_id INTEGER NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, cocktail_id)
);

CREATE TABLE IF NOT EXISTS notes (
  cocktail_id INTEGER NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cocktail_id, user_id)
);
`;

// Ensures the schema exists. Runs once per process (cached on globalThis).
export function ensureDb(): Promise<void> {
  if (!globalForDb._dbReady) {
    globalForDb._dbReady = pool()
      .query(SCHEMA)
      .then(() => undefined)
      .catch((err) => {
        // Reset so a later request can retry if the DB wasn't ready yet.
        globalForDb._dbReady = undefined;
        throw err;
      });
  }
  return globalForDb._dbReady;
}

export async function query<T = any>(
  text: string,
  params: any[] = [],
): Promise<T[]> {
  await ensureDb();
  const res = await pool().query(text, params);
  return res.rows as T[];
}
