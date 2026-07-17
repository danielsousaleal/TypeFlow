import { NextResponse } from "next/server";
import {
  createSessionToken,
  hashPassword,
  setSessionCookie,
  validateCredentials,
  verifyPassword,
} from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      nick?: string;
      password?: string;
    };

    const nick = body.nick?.trim() ?? "";
    const password = body.password ?? "";
    const validationError = validateCredentials(nick, password);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await ensureSchema();
    const db = getDb();

    const existing = await db.execute({
      sql: "SELECT id, nick, password_hash FROM users WHERE nick = ? COLLATE NOCASE",
      args: [nick],
    });

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      const ok = await verifyPassword(
        password,
        String(row.password_hash),
      );

      if (!ok) {
        return NextResponse.json(
          { error: "Senha incorreta para esse nick." },
          { status: 401 },
        );
      }

      const user = {
        id: Number(row.id),
        nick: String(row.nick),
      };

      const token = await createSessionToken(user);
      await setSessionCookie(token);
      return NextResponse.json({ user });
    }

    const passwordHash = await hashPassword(password);
    const inserted = await db.execute({
      sql: "INSERT INTO users (nick, password_hash) VALUES (?, ?) RETURNING id, nick",
      args: [nick, passwordHash],
    });

    const user = {
      id: Number(inserted.rows[0].id),
      nick: String(inserted.rows[0].nick),
    };

    const token = await createSessionToken(user);
    await setSessionCookie(token);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao autenticar. Confira as variáveis do Turso." },
      { status: 500 },
    );
  }
}
