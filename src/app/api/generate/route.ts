import { NextResponse } from "next/server";
import { generateTypingText } from "@/lib/groq";
import type { Difficulty, GameMode, TextLength } from "@/lib/types";

const MODES: GameMode[] = ["normal", "sem_acentos"];
const LENGTHS: TextLength[] = ["curto", "médio", "longo"];
const DIFFICULTIES: Difficulty[] = ["fáceis", "dia a dia", "difíceis"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      mode?: string;
      length?: string;
      difficulty?: string;
    };

    const mode = body.mode as GameMode;
    const length = body.length as TextLength;
    const difficulty = body.difficulty as Difficulty;

    if (
      !MODES.includes(mode) ||
      !LENGTHS.includes(length) ||
      !DIFFICULTIES.includes(difficulty)
    ) {
      return NextResponse.json(
        { error: "Parâmetros inválidos." },
        { status: 400 },
      );
    }

    const text = await generateTypingText(mode, length, difficulty);
    return NextResponse.json({ text });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Não foi possível gerar o texto." },
      { status: 500 },
    );
  }
}
