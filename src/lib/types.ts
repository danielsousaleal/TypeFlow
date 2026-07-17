export type GameStatus = "idle" | "loading" | "ready" | "typing" | "finished";

export type GameMode = "normal" | "sem_acentos";
export type TextLength = "curto" | "médio" | "longo";
export type Difficulty = "fáceis" | "dia a dia" | "difíceis";

export type User = {
  id: number;
  nick: string;
};

export type ScoreRow = {
  id: number;
  nick: string;
  wpm: number;
  accuracy: number;
  errors: number;
  duration_ms: number;
  mode: GameMode;
  length: TextLength;
  difficulty: Difficulty;
  created_at: string;
};

export type GeneratePayload = {
  mode: GameMode;
  length: TextLength;
  difficulty: Difficulty;
};

export type SubmitScorePayload = {
  wpm: number;
  accuracy: number;
  errors: number;
  durationMs: number;
  mode: GameMode;
  length: TextLength;
  difficulty: Difficulty;
};
