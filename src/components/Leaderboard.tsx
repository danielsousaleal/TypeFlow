"use client";

import { useState } from "react";
import { Medal, Trophy } from "lucide-react";
import type { ScoreRow } from "@/lib/types";

type LeaderboardProps = {
  scores: ScoreRow[];
  loading: boolean;
  currentNick?: string | null;
};

function formatDate(value: string) {
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function Leaderboard({
  scores,
  loading,
  currentNick,
}: LeaderboardProps) {
  const [filter, setFilter] = useState<"all" | "normal" | "sem_acentos">("all");
  const filteredScores =
    filter === "all" ? scores : scores.filter((score) => score.mode === filter);

  return (
    <section id="ranking" className="w-full scroll-mt-24 py-10 sm:py-14">
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[var(--accent)]/10 p-2.5 text-[var(--accent)]">
            <Trophy size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
              Ranking
            </h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              85% de precisão mínima · um resultado por modo
            </p>
          </div>
        </div>

        <div className="flex w-fit rounded-lg bg-[var(--surface)] p-1 text-xs font-medium">
          {(
            [
              ["all", "Todos"],
              ["normal", "Normal"],
              ["sem_acentos", "Sem acentos"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-md px-3 py-1.5 transition ${
                filter === value
                  ? "bg-[var(--surface-raised)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2" aria-label="Carregando ranking">
          {[0, 1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-14 animate-pulse rounded-xl bg-[var(--surface)]"
            />
          ))}
        </div>
      ) : filteredScores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] py-14 text-center">
          <Medal
            size={28}
            className="mx-auto mb-3 text-[var(--muted)]/60"
          />
          <p className="text-sm text-[var(--muted)]">
            Nenhum resultado nessa modalidade ainda.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="hidden grid-cols-[3rem_1fr_6rem_6rem_10rem_5rem] border-b border-[var(--border)] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] sm:grid">
            <span>#</span>
            <span>Jogador</span>
            <span>PPM</span>
            <span>Precisão</span>
            <span>Modalidade</span>
            <span className="text-right">Data</span>
          </div>

          {filteredScores.map((score, index) => {
            const isYou =
              currentNick &&
              score.nick.toLowerCase() === currentNick.toLowerCase();

            return (
              <div
                key={score.id}
                className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 border-b border-[var(--border)] px-4 py-3.5 last:border-b-0 sm:grid-cols-[3rem_1fr_6rem_6rem_10rem_5rem] ${
                  isYou ? "bg-[var(--accent)]/[0.06]" : ""
                }`}
              >
                <span
                  className={`font-mono text-sm ${
                    index < 3
                      ? "font-semibold text-[var(--accent)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">
                    {score.nick}
                    {isYou && (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                        você
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--muted)] sm:hidden">
                    {score.mode === "sem_acentos" ? "Sem acentos" : "Normal"} ·{" "}
                    {score.length}
                  </p>
                </div>

                <div className="text-right sm:hidden">
                  <p className="font-mono text-base font-semibold text-[var(--foreground)]">
                    {score.wpm}
                  </p>
                  <p className="text-[10px] uppercase text-[var(--muted)] sm:hidden">
                    {score.accuracy}% precisão
                  </p>
                </div>

                <span className="hidden font-mono text-sm text-[var(--foreground)] sm:block">
                  {score.wpm}
                </span>
                <span className="hidden font-mono text-sm text-[var(--muted)] sm:block">
                  {score.accuracy}%
                </span>
                <span className="hidden text-xs text-[var(--muted)] sm:block">
                  {score.mode === "sem_acentos" ? "Sem acentos" : "Normal"} ·{" "}
                  {score.length}
                </span>
                <span className="hidden text-right text-xs text-[var(--muted)] sm:block">
                  {formatDate(score.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]/70">
        Uma nova marca substitui a anterior quando seu saldo melhora. Na
        comparação, 20 PPM equivalem a aproximadamente 2% de precisão.
      </p>
    </section>
  );
}
