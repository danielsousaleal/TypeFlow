"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  AlertCircle,
  LogOut,
  Play,
  RefreshCw,
  Trophy,
  Type,
  UserRound,
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

    void loadScores();
    void fetchText();
    // Carga inicial apenas — mudanças de config pedem "Novo Teste"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === "ready" && typingAreaRef.current) {
      typingAreaRef.current.focus();
    }
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

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível salvar.");
      }

      setSaveMessage("Pontuação salva no ranking!");
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
      let charClass = "text-gray-500 transition-colors duration-100";

      if (index < typedText.length) {
        charClass =
          typedText[index] === char
            ? "text-[#A9927D]"
            : "rounded-sm bg-red-900/40 text-red-400";
      }

      const isCursor = index === typedText.length && status !== "finished";

      return (
        <span key={index} className="relative">
          {isCursor && (
            <span className="absolute top-0 left-0 h-full w-[2px] animate-pulse bg-[#A9927D]" />
          )}
          <span className={charClass}>{char}</span>
        </span>
      );
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#121619] px-4 py-10 font-sans text-[#A9927D] selection:bg-[#323E40] selection:text-[#A9927D]">
      <header className="mb-8 flex w-full max-w-5xl flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-[#5E503F] bg-[#22333B] p-3 shadow-lg">
            <Type size={28} className="text-[#A9927D]" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">TypeFlow</h1>
            <p className="text-sm text-[#A9927D]/70">
              Treino de digitação com IA + placar opcional
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {status === "typing" && (
            <span className="flex items-center gap-2 rounded-lg border border-[#5E503F] bg-[#22333B] px-4 py-2">
              <RefreshCw size={18} className="animate-spin" />
              Em progresso...
            </span>
          )}

          {user ? (
            <div className="flex items-center gap-2 rounded-lg border border-[#5E503F] bg-[#22333B] px-3 py-2">
              <UserRound size={18} />
              <span className="font-semibold">{user.nick}</span>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="ml-1 rounded-md border border-[#5E503F] bg-[#323E40] p-1.5 transition hover:bg-[#3d4b4d]"
                title="Sair"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-[#5E503F] bg-[#22333B] px-4 py-2 font-semibold transition hover:bg-[#2c414a]"
            >
              <UserRound size={18} />
              Entrar no placar
            </button>
          )}
        </div>
      </header>

      <section className="mb-8 flex w-full max-w-5xl flex-wrap items-end justify-between gap-6 rounded-2xl border border-[#5E503F] bg-[#22333B] p-6 shadow-2xl">
        <div className="flex flex-grow flex-wrap gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold tracking-wider uppercase text-[#A9927D]/80">
              Modalidade
            </label>
            <select
              className="min-w-[140px] cursor-pointer rounded-lg border border-[#5E503F] bg-[#323E40] p-3 text-[#A9927D] outline-none ring-[#A9927D] transition-all focus:ring-2 disabled:opacity-50"
              value={mode}
              onChange={(e) => setMode(e.target.value as GameMode)}
              disabled={status === "loading" || status === "typing"}
            >
              <option value="normal">Normal (Com acentos)</option>
              <option value="sem_acentos">Sem Acentos / Pontuação</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold tracking-wider uppercase text-[#A9927D]/80">
              Tamanho
            </label>
            <select
              className="min-w-[140px] cursor-pointer rounded-lg border border-[#5E503F] bg-[#323E40] p-3 text-[#A9927D] outline-none ring-[#A9927D] transition-all focus:ring-2 disabled:opacity-50"
              value={length}
              onChange={(e) => setLength(e.target.value as TextLength)}
              disabled={status === "loading" || status === "typing"}
            >
              <option value="curto">Curto (~20 pal.)</option>
              <option value="médio">Médio (~50 pal.)</option>
              <option value="longo">Longo (~100 pal.)</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold tracking-wider uppercase text-[#A9927D]/80">
              Dificuldade
            </label>
            <select
              className="min-w-[140px] cursor-pointer rounded-lg border border-[#5E503F] bg-[#323E40] p-3 text-[#A9927D] outline-none ring-[#A9927D] transition-all focus:ring-2 disabled:opacity-50"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              disabled={status === "loading" || status === "typing"}
            >
              <option value="fáceis">Fáceis</option>
              <option value="dia a dia">Dia a Dia</option>
              <option value="difíceis">Difíceis</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void fetchText()}
          disabled={status === "loading"}
          className="flex items-center gap-2 rounded-lg bg-[#A9927D] px-6 py-3 font-bold text-[#121619] transition-all hover:scale-105 hover:bg-[#8e7a68] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? (
            <>
              <RefreshCw size={20} className="animate-spin" /> Gerando...
            </>
          ) : (
            <>
              <Play size={20} /> Novo Teste
            </>
          )}
        </button>
      </section>

      <section className="relative mb-12 w-full max-w-5xl">
        {status === "loading" ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-[#5E503F] bg-[#22333B] shadow-xl">
            <div className="flex animate-pulse flex-col items-center gap-4">
              <RefreshCw size={40} className="animate-spin text-[#A9927D]" />
              <p className="text-lg">
                A Inteligência Artificial está escrevendo seu texto...
              </p>
            </div>
          </div>
        ) : (
          <div
            ref={typingAreaRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className="min-h-[250px] w-full cursor-text rounded-2xl border border-[#5E503F] bg-[#22333B] p-8 shadow-2xl transition-all outline-none focus:ring-2 focus:ring-[#A9927D] focus:ring-offset-4 focus:ring-offset-[#121619]"
          >
            {(status === "idle" || status === "ready") && (
              <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full border border-[#5E503F] bg-[#323E40] px-3 py-1 text-xs text-[#A9927D]/70">
                <AlertCircle size={14} />
                Comece a digitar para iniciar o cronômetro
              </div>
            )}

            <div
              className="font-mono text-2xl leading-relaxed select-none md:text-3xl"
              style={{ wordBreak: "break-word" }}
            >
              {renderText()}
            </div>
          </div>
        )}
      </section>

      <div className="mb-10 w-full max-w-5xl">
        <Leaderboard
          scores={scores}
          loading={scoresLoading}
          currentNick={user?.nick}
        />
      </div>

      {status === "finished" && startTime && endTime && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border-2 border-[#5E503F] bg-[#22333B] p-8 shadow-2xl md:p-12">
            <div className="mb-10 text-center">
              <div className="mb-4 inline-flex items-center justify-center rounded-full border border-[#5E503F] bg-[#323E40] p-4">
                <Trophy size={48} className="text-[#A9927D]" />
              </div>
              <h2 className="text-4xl font-bold">Teste Concluído!</h2>
              <p className="mt-2 text-[#A9927D]/80">
                Aqui estão seus resultados da rodada.
              </p>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-[#5E503F] bg-[#323E40] p-4 text-center">
                <p className="mb-1 text-sm tracking-wider uppercase opacity-70">
                  Velocidade
                </p>
                <p className="text-4xl font-bold">
                  {wpm} <span className="text-lg font-normal">PPM</span>
                </p>
              </div>
              <div className="rounded-xl border border-[#5E503F] bg-[#323E40] p-4 text-center">
                <p className="mb-1 text-sm tracking-wider uppercase opacity-70">
                  Precisão
                </p>
                <p className="text-4xl font-bold">
                  {accuracy}
                  <span className="text-lg font-normal">%</span>
                </p>
              </div>
              <div className="rounded-xl border border-[#5E503F] bg-[#323E40] p-4 text-center">
                <p className="mb-1 text-sm tracking-wider uppercase opacity-70">
                  Tempo
                </p>
                <p className="text-4xl font-bold">
                  {((endTime - startTime) / 1000).toFixed(1)}
                  <span className="text-lg font-normal">s</span>
                </p>
              </div>
              <div className="rounded-xl border border-[#5E503F] bg-[#323E40] p-4 text-center">
                <p className="mb-1 text-sm tracking-wider uppercase opacity-70">
                  Erros
                </p>
                <p className="text-4xl font-bold text-red-400">{errorCount}</p>
              </div>
            </div>

            {saveMessage && (
              <p className="mb-4 rounded-lg border border-[#5E503F] bg-[#323E40] px-4 py-3 text-center text-sm">
                {saveMessage}
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleSaveScore()}
                disabled={savingScore}
                className="flex flex-1 items-center justify-center gap-3 rounded-xl border border-[#5E503F] bg-[#323E40] px-6 py-4 text-lg font-bold transition hover:bg-[#3d4b4d] disabled:opacity-50"
              >
                <Trophy size={22} />
                {user
                  ? savingScore
                    ? "Salvando..."
                    : "Salvar no placar"
                  : "Entrar e salvar"}
              </button>

              <button
                type="button"
                onClick={() => void fetchText()}
                className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-[#A9927D] px-6 py-4 text-lg font-bold text-[#121619] transition hover:scale-[1.02] hover:bg-[#8e7a68] active:scale-[0.98]"
              >
                <RefreshCw size={22} />
                Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-auto pt-8 pb-4 text-center text-sm opacity-50">
        <p>
          Clique na área de texto e comece a digitar. O timer inicia na primeira
          tecla.
        </p>
        <p className="mt-1">
          Pressione{" "}
          <kbd className="rounded border border-[#5E503F] bg-[#323E40] px-2 py-1">
            Backspace
          </kbd>{" "}
          para corrigir erros.
        </p>
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
