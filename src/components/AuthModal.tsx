"use client";

import { FormEvent, useState } from "react";
import { LogIn, X } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border-2 border-[#5E503F] bg-[#22333B] p-8 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#A9927D]">
              Entrar no placar
            </h2>
            <p className="mt-2 text-sm text-[#A9927D]/80">
              Nick novo cria conta automaticamente. Se o nick já existir,
              usamos a senha cadastrada.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#5E503F] bg-[#323E40] p-2 text-[#A9927D] transition hover:bg-[#3d4b4d]"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold uppercase tracking-wider text-[#A9927D]/80">
              Nick
            </label>
            <input
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              className="rounded-lg border border-[#5E503F] bg-[#323E40] p-3 text-[#A9927D] outline-none ring-[#A9927D] focus:ring-2"
              placeholder="ex: daniel_dev"
              autoComplete="username"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold uppercase tracking-wider text-[#A9927D]/80">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-[#5E503F] bg-[#323E40] p-3 text-[#A9927D] outline-none ring-[#A9927D] focus:ring-2"
              placeholder="qualquer senha (mín. 4)"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#A9927D] px-6 py-3 font-bold text-[#121619] transition hover:bg-[#8e7a68] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn size={18} />
            {loading ? "Entrando..." : "Entrar / Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
