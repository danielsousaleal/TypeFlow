import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;

export function getDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error(
      "TURSO_DATABASE_URL e TURSO_AUTH_TOKEN precisam estar configurados.",
    );
  }

  if (!client) {
    client = createClient({ url, authToken });
  }

  return client;
}

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getDb();

      await db.batch(
        [
          `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nick TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`,
          `CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            wpm INTEGER NOT NULL,
            accuracy INTEGER NOT NULL,
            errors INTEGER NOT NULL,
            duration_ms INTEGER NOT NULL,
            mode TEXT NOT NULL,
            length TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`,
          `CREATE INDEX IF NOT EXISTS idx_scores_wpm ON scores(wpm DESC)`,
          `CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id)`,
        ],
        "write",
      );
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }

  await schemaReady;
}
