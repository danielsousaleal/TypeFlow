import { createClient, type Client } from "@libsql/client";
import { isBetterScore } from "@/lib/score";

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;
const MIN_RANKING_ACCURACY = 85;

type LegacyScore = {
  id: number;
  userId: number;
  mode: string;
  wpm: number;
  accuracy: number;
};

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

async function migrateLegacyScores(db: Client) {
  const result = await db.execute(`
    SELECT id, user_id, mode, wpm, accuracy
    FROM scores
    ORDER BY datetime(created_at) ASC, id ASC
  `);

  const scores: LegacyScore[] = result.rows.map((row) => ({
    id: Number(row.id),
    userId: Number(row.user_id),
    mode: String(row.mode),
    wpm: Number(row.wpm),
    accuracy: Number(row.accuracy),
  }));

  const winners = new Map<string, LegacyScore>();

  for (const score of scores) {
    if (score.accuracy < MIN_RANKING_ACCURACY) continue;

    const key = `${score.userId}:${score.mode}`;
    const previous = winners.get(key);

    if (!previous || isBetterScore(score, previous)) {
      winners.set(key, score);
    }
  }

  const winnerIds = new Set([...winners.values()].map((score) => score.id));
  const obsoleteIds = scores
    .filter((score) => !winnerIds.has(score.id))
    .map((score) => score.id);

  for (let offset = 0; offset < obsoleteIds.length; offset += 100) {
    const chunk = obsoleteIds.slice(offset, offset + 100);
    await db.batch(
      chunk.map((id) => ({
        sql: "DELETE FROM scores WHERE id = ?",
        args: [id],
      })),
      "write",
    );
  }

  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_user_mode
    ON scores(user_id, mode)
  `);
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

      // Corrige dados de versões antigas e garante no máximo um resultado
      // de cada usuário por modalidade.
      await migrateLegacyScores(db);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }

  await schemaReady;
}
