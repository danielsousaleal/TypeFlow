"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole, UserRound, X } from "lucide-react";
import type { User } from "@/lib/types";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
};

export function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nick, password }),
      });

      const data = (await response.json()) as {
        user?: User;
        error?: string;
      };

      if (!response.ok || !data.user) {
        throw new Error(data.error ?? "Falha ao entrar.");
      }

      onSuccess(data.user);
      setNick("");
      setPassword("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="fade-up w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl shadow-black/40 sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <span className="mb-3 inline-flex rounded-lg bg-[var(--accent)]/10 p-2 text-[var(--accent)]">
              <UserRound size={20} />
            </span>
            <h2
              id="auth-title"
              className="text-xl font-semibold tracking-tight text-[var(--foreground)]"
            >
              Salve seus resultados
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
              Um nick novo cria sua conta. Se ele já existir, basta usar a
              mesma senha.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--foreground)]"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
              Nick
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 transition focus-within:border-[var(--accent)]/60">
              <UserRound size={17} className="shrink-0 text-[var(--muted)]" />
              <input
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]/60"
                placeholder="seu_nick"
                autoComplete="username"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
              Senha
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 transition focus-within:border-[var(--accent)]/60">
              <LockKeyhole
                size={17}
                className="shrink-0 text-[var(--muted)]"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]/60"
                placeholder="mínimo de 4 caracteres"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {error && (
            <p
              className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[#17140a] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Continuar"}
            {!loading && <ArrowRight size={17} />}
          </button>
        </form>
      </div>
    </div>
  );
}
