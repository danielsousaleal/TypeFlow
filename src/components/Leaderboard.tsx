"use client";

import { Trophy } from "lucide-react";
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
  return (
    <section className="w-full max-w-5xl rounded-2xl border border-[#5E503F] bg-[#22333B] p-6 shadow-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl border border-[#5E503F] bg-[#323E40] p-3">
          <Trophy size={22} className="text-[#A9927D]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#A9927D]">Ranking</h2>
          <p className="text-sm text-[#A9927D]/70">
            Top 50 por PPM e precisão mínima de 85%. Cada pessoa aparece uma
            vez por modalidade (troca: ~20 PPM ≈ 2% de precisão).
          </p>
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-[#A9927D]/70">
          Carregando placar...
        </p>
      ) : scores.length === 0 ? (
        <p className="py-8 text-center text-[#A9927D]/70">
          Ainda sem pontuações. Seja o primeiro no ranking!
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-y-2 text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-[#A9927D]/60">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Nick</th>
                <th className="px-3 py-2">PPM</th>
                <th className="px-3 py-2">Precisão</th>
                <th className="px-3 py-2">Modo</th>
                <th className="px-3 py-2">Data</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score, index) => {
                const isYou =
                  currentNick &&
                  score.nick.toLowerCase() === currentNick.toLowerCase();

                return (
                  <tr
                    key={score.id}
                    className={`rounded-xl ${
                      isYou
                        ? "bg-[#A9927D]/15 outline outline-1 outline-[#A9927D]/40"
                        : "bg-[#323E40]/70"
                    }`}
                  >
                    <td className="rounded-l-xl px-3 py-3 font-mono text-[#A9927D]/80">
                      {index + 1}
                    </td>
                    <td className="px-3 py-3 font-semibold text-[#A9927D]">
                      {score.nick}
                      {isYou ? (
                        <span className="ml-2 text-xs font-normal opacity-70">
                          (você)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 font-bold text-[#A9927D]">
                      {score.wpm}
                    </td>
                    <td className="px-3 py-3 text-[#A9927D]">{score.accuracy}%</td>
                    <td className="px-3 py-3 text-sm text-[#A9927D]/80">
                      {score.mode === "sem_acentos" ? "Sem acentos" : "Normal"} ·{" "}
                      {score.length} · {score.difficulty}
                    </td>
                    <td className="rounded-r-xl px-3 py-3 text-sm text-[#A9927D]/70">
                      {formatDate(score.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
