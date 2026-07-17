import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";
import { MAX_ACCURACY_DROP } from "@/lib/score";
import type {
  DeviceType,
  Difficulty,
  GameMode,
  TextLength,
} from "@/lib/types";

const MODES: GameMode[] = ["normal", "sem_acentos"];
const LENGTHS: TextLength[] = ["curto", "médio", "longo"];
const DIFFICULTIES: Difficulty[] = ["fáceis", "dia a dia", "difíceis"];
const DEVICES: DeviceType[] = ["desktop", "mobile"];
const MIN_RANKING_ACCURACY = 85;

export async function GET(request: Request) {
  try {
    const requestedDevice = new URL(request.url).searchParams.get("device");
    const device = requestedDevice as DeviceType;

    if (!DEVICES.includes(device)) {
      return NextResponse.json(
        { error: "Categoria de dispositivo inválida." },
        { status: 400 },
      );
    }

    await ensureSchema();
    const db = getDb();

    const result = await db.execute({
      sql: `SELECT
          s.id,
          u.nick,
          s.wpm,
          s.accuracy,
          s.errors,
          s.duration_ms,
          s.mode,
          s.length,
          s.difficulty,
          s.device,
          s.created_at
        FROM scores s
        INNER JOIN users u ON u.id = s.user_id
        WHERE s.accuracy >= ?
          AND s.device = ?
        ORDER BY s.wpm DESC, s.accuracy DESC, s.created_at ASC
        LIMIT 50`,
      args: [MIN_RANKING_ACCURACY, device],
    });

    const scores = result.rows.map((row) => ({
      id: Number(row.id),
      nick: String(row.nick),
      wpm: Number(row.wpm),
      accuracy: Number(row.accuracy),
      errors: Number(row.errors),
      duration_ms: Number(row.duration_ms),
      mode: String(row.mode) as GameMode,
      length: String(row.length) as TextLength,
      difficulty: String(row.difficulty) as Difficulty,
      device: String(row.device) as DeviceType,
      created_at: String(row.created_at),
    }));

    return NextResponse.json({ scores });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Não foi possível carregar o ranking." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Faça login para salvar no placar." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      wpm?: number;
      accuracy?: number;
      errors?: number;
      durationMs?: number;
      mode?: string;
      length?: string;
      difficulty?: string;
      device?: string;
    };

    const wpm = Number(body.wpm);
    const accuracy = Number(body.accuracy);
    const errors = Number(body.errors);
    const durationMs = Number(body.durationMs);
    const mode = body.mode as GameMode;
    const length = body.length as TextLength;
    const difficulty = body.difficulty as Difficulty;
    const device = body.device as DeviceType;

    if (
      !Number.isFinite(wpm) ||
      wpm < 0 ||
      wpm > 400 ||
      !Number.isFinite(accuracy) ||
      accuracy < 0 ||
      accuracy > 100 ||
      !Number.isFinite(errors) ||
      errors < 0 ||
      !Number.isFinite(durationMs) ||
      durationMs < 500 ||
      durationMs > 60 * 60 * 1000 ||
      !MODES.includes(mode) ||
      !LENGTHS.includes(length) ||
      !DIFFICULTIES.includes(difficulty) ||
      !DEVICES.includes(device)
    ) {
      return NextResponse.json(
        { error: "Pontuação inválida." },
        { status: 400 },
      );
    }

    if (accuracy < MIN_RANKING_ACCURACY) {
      return NextResponse.json(
        {
          error: `É preciso ter pelo menos ${MIN_RANKING_ACCURACY}% de precisão para entrar no ranking.`,
        },
        { status: 400 },
      );
    }

    await ensureSchema();
    const db = getDb();

    const result = await db.execute({
      sql: `INSERT INTO scores
        (user_id, wpm, accuracy, errors, duration_ms, mode, length, difficulty, device)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, mode, device) DO UPDATE SET
          wpm = excluded.wpm,
          accuracy = excluded.accuracy,
          errors = excluded.errors,
          duration_ms = excluded.duration_ms,
          length = excluded.length,
          difficulty = excluded.difficulty,
          created_at = datetime('now')
        WHERE (
          excluded.wpm > scores.wpm
          AND excluded.accuracy >= scores.accuracy - ${MAX_ACCURACY_DROP}
        ) OR (
          excluded.wpm = scores.wpm
          AND excluded.accuracy > scores.accuracy
        )`,
      args: [
        user.id,
        Math.round(wpm),
        Math.round(accuracy),
        Math.round(errors),
        Math.round(durationMs),
        mode,
        length,
        difficulty,
        device,
      ],
    });

    const updated = result.rowsAffected > 0;

    return NextResponse.json(
      {
        ok: true,
        updated,
        message: updated
          ? "Pontuação salva no ranking!"
          : "Sua melhor pontuação nessa modalidade continua no ranking.",
      },
      { status: updated ? 201 : 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Não foi possível salvar a pontuação." },
      { status: 500 },
    );
  }
}
