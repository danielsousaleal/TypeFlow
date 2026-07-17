"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  ArrowDown,
  CircleX,
  Keyboard,
  LoaderCircle,
  LogOut,
  RefreshCw,
  RotateCcw,
  Save,
  Target,
  Timer,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { Leaderboard } from "@/components/Leaderboard";
import type {
  Difficulty,
  GameMode,
  GameStatus,
  ScoreRow,
  TextLength,
  User,
} from "@/lib/types";

const MODE_OPTIONS: Array<{ value: GameMode; label: string }> = [
  { value: "normal", label: "normal" },
  { value: "sem_acentos", label: "sem acentos" },
];

const LENGTH_OPTIONS: Array<{ value: TextLength; label: string }> = [
  { value: "curto", label: "curto" },
  { value: "médio", label: "médio" },
  { value: "longo", label: "longo" },
];

const DIFFICULTY_OPTIONS: Array<{ value: Difficulty; label: string }> = [
  { value: "fáceis", label: "fácil" },
  { value: "dia a dia", label: "cotidiano" },
  { value: "difíceis", label: "difícil" },
];

export default function TypeFlowApp() {
  const [status, setStatus] = useState<GameStatus>("idle");
  const [textToType, setTextToType] = useState("");
  const [typedText, setTypedText] = useState("");

  const [mode, setMode] = useState<GameMode>("normal");
  const [length, setLength] = useState<TextLength>("médio");
  const [difficulty, setDifficulty] = useState<Difficulty>("dia a dia");

  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savingScore, setSavingScore] = useState(false);
  const [pendingSaveAfterAuth, setPendingSaveAfterAuth] = useState(false);
  const [now, setNow] = useState(0);

  const typingAreaRef = useRef<HTMLDivElement>(null);
  const errorCountRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const latestStatsRef = useRef({
    wpm: 0,
    accuracy: 0,
    errorCount: 0,
    startTime: null as number | null,
    endTime: null as number | null,
    mode: "normal" as GameMode,
    length: "médio" as TextLength,
    difficulty: "dia a dia" as Difficulty,
  });

  useEffect(() => {
    latestStatsRef.current = {
      wpm,
      accuracy,
      errorCount,
      startTime,
      endTime,
      mode,
      length,
      difficulty,
    };
  }, [wpm, accuracy, errorCount, startTime, endTime, mode, length, difficulty]);

  const loadScores = useCallback(async () => {
    setScoresLoading(true);
    try {
      const response = await fetch("/api/scores");
      const data = (await response.json()) as {
        scores?: ScoreRow[];
      };
      setScores(data.scores ?? []);
    } catch {
      setScores([]);
    } finally {
      setScoresLoading(false);
    }
  }, []);

  const fetchText = useCallback(async () => {
    setStatus("loading");
    setTypedText("");
    setStartTime(null);
    setEndTime(null);
    setWpm(0);
    setAccuracy(0);
    setErrorCount(0);
    errorCountRef.current = 0;
    startTimeRef.current = null;
    setSaveMessage(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, length, difficulty }),
      });

      const data = (await response.json()) as {
        text?: string;
        error?: string;
      };

      if (!response.ok || !data.text) {
        throw new Error(data.error ?? "Falha ao gerar texto");
      }

      setTextToType(data.text);
      setStatus("ready");
    } catch {
      const fallback =
        "Houve um erro ao conectar com a inteligencia artificial. Este e um texto padrao de seguranca para que voce possa continuar praticando sua digitacao sem interrupcoes maiores.";
      setTextToType(
        mode === "sem_acentos"
          ? fallback
          : "Houve um erro ao conectar com a inteligência artificial. Este é um texto padrão de segurança para que você possa continuar praticando sua digitação sem interrupções maiores.",
      );
      setStatus("ready");
    }
  }, [mode, length, difficulty]);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { user?: User | null }) => setUser(data.user ?? null))
      .catch(() => setUser(null));

    queueMicrotask(() => {
      void loadScores();
      void fetchText();
    });
    // Carga inicial apenas — mudanças de config pedem "Novo Teste"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === "ready" && typingAreaRef.current) {
      typingAreaRef.current.focus();
    }
  }, [status]);

  useEffect(() => {
    if (status !== "typing") return;

    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [status]);

  const finishTest = useCallback(
    (finalTypedText: string, totalErrors: number, startedAt: number) => {
      const end = Date.now();
      setEndTime(end);
      setStatus("finished");

      const timeInMinutes = (end - startedAt) / 60000;
      const wordsTyped = finalTypedText.length / 5;
      const calculatedWpm =
        timeInMinutes > 0 ? Math.round(wordsTyped / timeInMinutes) : 0;

      let correct = 0;
      for (let i = 0; i < finalTypedText.length; i += 1) {
        if (finalTypedText[i] === textToType[i]) correct += 1;
      }

      const calculatedAccuracy =
        finalTypedText.length > 0
          ? Math.round((correct / finalTypedText.length) * 100)
          : 0;

      setErrorCount(totalErrors);
      setWpm(calculatedWpm);
      setAccuracy(calculatedAccuracy);
    },
    [textToType],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (status !== "ready" && status !== "typing") return;

      if (event.key === " ") event.preventDefault();

      if (status === "ready" && event.key.length === 1) {
        const now = Date.now();
        setStatus("typing");
        setStartTime(now);
        setNow(now);
        startTimeRef.current = now;
      }

      if (event.key === "Backspace") {
        setTypedText((prev) => prev.slice(0, -1));
        return;
      }

      if (event.key.length === 1 && typedText.length < textToType.length) {
        const expected = textToType[typedText.length];
        const next = typedText + event.key;
        setTypedText(next);

        if (event.key !== expected) {
          errorCountRef.current += 1;
          setErrorCount(errorCountRef.current);
        }

        if (next.length === textToType.length && startTimeRef.current) {
          finishTest(next, errorCountRef.current, startTimeRef.current);
        }
      }
    },
    [status, typedText, textToType, finishTest],
  );

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  async function saveScoreForUser() {
    const stats = latestStatsRef.current;
    if (!stats.startTime || !stats.endTime) return;

    setSavingScore(true);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wpm: stats.wpm,
          accuracy: stats.accuracy,
          errors: stats.errorCount,
          durationMs: stats.endTime - stats.startTime,
          mode: stats.mode,
          length: stats.length,
          difficulty: stats.difficulty,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível salvar.");
      }

      setSaveMessage(data.message ?? "Pontuação salva no ranking!");
      await loadScores();
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : "Erro ao salvar pontuação.",
      );
    } finally {
      setSavingScore(false);
      setPendingSaveAfterAuth(false);
    }
  }

  async function handleSaveScore() {
    if (!user) {
      setPendingSaveAfterAuth(true);
      setAuthOpen(true);
      return;
    }

    await saveScoreForUser();
  }

  function renderText() {
    return textToType.split("").map((char, index) => {
      let charClass = "text-[var(--muted)]/55 transition-colors duration-75";

      if (index < typedText.length) {
        charClass =
          typedText[index] === char
            ? "text-[var(--foreground)]"
            : "rounded-sm bg-red-400/15 text-[var(--danger)]";
      }

      const isCursor = index === typedText.length && status !== "finished";

      return (
        <span key={index} className="relative">
          {isCursor && (
            <span className="absolute top-[8%] left-0 h-[84%] w-[2px] animate-pulse rounded-full bg-[var(--accent)]" />
          )}
          <span className={charClass}>{char}</span>
        </span>
      );
    });
  }

  const elapsedMs = startTime
    ? Math.max(
        0,
        (status === "typing" ? now : (endTime ?? now)) - startTime,
      )
    : 0;
  const liveWpm =
    elapsedMs > 0
      ? Math.round(typedText.length / 5 / (elapsedMs / 60_000))
      : 0;
  const currentCorrect = typedText
    .split("")
    .reduce(
      (total, char, index) => total + (char === textToType[index] ? 1 : 0),
      0,
    );
  const liveAccuracy =
    typedText.length > 0
      ? Math.round((currentCorrect / typedText.length) * 100)
      : 100;
  const progress =
    textToType.length > 0
      ? Math.min(100, (typedText.length / textToType.length) * 100)
      : 0;

  return (
    <div className="app-glow min-h-screen text-[var(--foreground)]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6 sm:py-8">
        <a
          href="#teste"
          className="group flex items-center gap-2.5"
          aria-label="TypeFlow — voltar ao teste"
        >
          <span className="text-[var(--accent)] transition group-hover:rotate-[-4deg]">
            <Keyboard size={28} strokeWidth={2.2} />
          </span>
          <span className="text-xl font-semibold tracking-[-0.04em]">
            type<span className="text-[var(--accent)]">flow</span>
          </span>
        </a>

        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href="#ranking"
            className="hidden items-center gap-2 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)] sm:flex"
          >
            <Trophy size={15} />
            ranking
          </a>

          {user ? (
            <div className="flex items-center gap-1 rounded-lg bg-[var(--surface)] p-1 pl-3">
              <span className="max-w-28 truncate text-sm font-medium">
                {user.nick}
              </span>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="rounded-md p-2 text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--foreground)]"
                aria-label="Sair da conta"
                title="Sair"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            >
              <UserRound size={16} />
              <span className="hidden sm:inline">entrar</span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <section id="teste" className="scroll-mt-8 pt-6 sm:pt-12">
          <div className="mx-auto flex max-w-4xl flex-col gap-8">
            <div className="flex flex-col items-center justify-between gap-3 rounded-xl bg-[var(--surface)] p-2 lg:flex-row">
              <div className="flex w-full flex-wrap items-center justify-center gap-1 lg:w-auto lg:justify-start">
                <span className="hidden px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] sm:inline">
                  modo
                </span>
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    disabled={status === "loading" || status === "typing"}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      mode === option.value
                        ? "bg-[var(--surface-raised)] text-[var(--accent)] shadow-sm"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}

                <span className="mx-1 h-5 w-px bg-[var(--border)]" />

                {LENGTH_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLength(option.value)}
                    disabled={status === "loading" || status === "typing"}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      length === option.value
                        ? "bg-[var(--surface-raised)] text-[var(--accent)] shadow-sm"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}

                <span className="mx-1 hidden h-5 w-px bg-[var(--border)] sm:block" />

                {DIFFICULTY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDifficulty(option.value)}
                    disabled={status === "loading" || status === "typing"}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      difficulty === option.value
                        ? "bg-[var(--surface-raised)] text-[var(--accent)] shadow-sm"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void fetchText()}
                disabled={status === "loading"}
                className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--surface-raised)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
              >
                <RefreshCw
                  size={14}
                  className={status === "loading" ? "animate-spin" : ""}
                />
                novo texto
              </button>
            </div>

            <div className="min-h-10">
              {status === "typing" ? (
                <div className="fade-up flex items-end gap-6 font-mono">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[var(--muted)]">
                      ppm
                    </p>
                    <p className="text-2xl text-[var(--accent)]">{liveWpm}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[var(--muted)]">
                      precisão
                    </p>
                    <p className="text-lg text-[var(--foreground)]">
                      {liveAccuracy}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[var(--muted)]">
                      tempo
                    </p>
                    <p className="text-lg text-[var(--foreground)]">
                      {(elapsedMs / 1000).toFixed(1)}s
                    </p>
                  </div>
                </div>
              ) : status === "ready" ? (
                <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
                  pronto — comece a digitar
                </p>
              ) : null}
            </div>

            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-px overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full bg-[var(--accent)] transition-[width] duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {status === "loading" ? (
                <div className="flex min-h-[310px] flex-col items-center justify-center gap-3 text-[var(--muted)]">
                  <LoaderCircle
                    size={24}
                    className="animate-spin text-[var(--accent)]"
                  />
                  <p className="text-sm">criando um texto para você...</p>
                </div>
              ) : status === "finished" && startTime && endTime ? (
                <div className="fade-up py-10">
                  <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                        teste concluído
                      </p>
                      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                        Bom ritmo.
                      </h2>
                    </div>
                    <p
                      className={`text-sm ${
                        accuracy >= 85
                          ? "text-emerald-400"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {accuracy >= 85
                        ? "resultado elegível para o ranking"
                        : "alcance 85% para entrar no ranking"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
                    {[
                      {
                        label: "ppm",
                        value: wpm,
                        icon: <Zap size={15} />,
                        accent: true,
                      },
                      {
                        label: "precisão",
                        value: `${accuracy}%`,
                        icon: <Target size={15} />,
                      },
                      {
                        label: "tempo",
                        value: `${((endTime - startTime) / 1000).toFixed(1)}s`,
                        icon: <Timer size={15} />,
                      },
                      {
                        label: "erros",
                        value: errorCount,
                        icon: <CircleX size={15} />,
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="bg-[var(--surface)] px-5 py-6"
                      >
                        <p className="mb-3 flex items-center gap-2 text-xs text-[var(--muted)]">
                          {stat.icon}
                          {stat.label}
                        </p>
                        <p
                          className={`font-mono text-3xl ${
                            stat.accent
                              ? "text-[var(--accent)]"
                              : "text-[var(--foreground)]"
                          }`}
                        >
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {saveMessage && (
                    <p
                      className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center text-sm text-[var(--muted)]"
                      role="status"
                    >
                      {saveMessage}
                    </p>
                  )}

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void fetchText()}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#17140a] transition hover:brightness-110 active:scale-[0.99]"
                    >
                      <RotateCcw size={16} />
                      jogar novamente
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveScore()}
                      disabled={savingScore || accuracy < 85}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Save size={16} />
                      {user
                        ? savingScore
                          ? "salvando..."
                          : "salvar resultado"
                        : "entrar e salvar"}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  ref={typingAreaRef}
                  tabIndex={0}
                  onKeyDown={handleKeyDown}
                  onClick={() => typingAreaRef.current?.focus()}
                  className="flex min-h-[310px] cursor-text items-center py-10 outline-none"
                  aria-label="Área de digitação"
                >
                  <div
                    className="w-full font-mono text-[1.55rem] leading-[1.7] tracking-[-0.02em] select-none sm:text-[2rem] sm:leading-[1.65]"
                    style={{ wordBreak: "break-word" }}
                  >
                    {renderText()}
                  </div>
                </div>
              )}
            </div>

            {status !== "finished" && (
              <div className="flex min-h-8 flex-col items-center justify-between gap-3 text-xs text-[var(--muted)]/70 sm:flex-row">
                <span>
                  o cronômetro começa com a primeira tecla
                </span>
                <span className="flex items-center gap-2">
                  <kbd className="rounded bg-[var(--surface)] px-2 py-1 text-[10px]">
                    backspace
                  </kbd>
                  para corrigir
                </span>
              </div>
            )}

            <a
              href="#ranking"
              className="mx-auto mt-6 flex w-fit flex-col items-center gap-1 text-xs text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              ver ranking
              <ArrowDown size={14} />
            </a>
          </div>
        </section>

        <div className="mx-auto mt-14 max-w-5xl border-t border-[var(--border)] sm:mt-20">
          <Leaderboard
            scores={scores}
            loading={scoresLoading}
            currentNick={user?.nick}
          />
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-8 text-xs text-[var(--muted)]/60 sm:px-6">
        <span>typeflow</span>
        <span>textos em português gerados por IA</span>
      </footer>

      <AuthModal
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          setPendingSaveAfterAuth(false);
        }}
        onSuccess={(nextUser) => {
          setUser(nextUser);
          if (pendingSaveAfterAuth) {
            void saveScoreForUser();
          } else {
            setSaveMessage("Login feito. Você já pode salvar no placar.");
          }
        }}
      />
    </div>
  );
}
