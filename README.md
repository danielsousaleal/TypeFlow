# TypeFlow

Treino de digitação em português do Brasil, com textos gerados pela Groq e placar opcional no Turso (SQLite).

## O que tem

- Geração de texto **só no servidor** (`/api/generate`) — a chave Groq nunca vai para o browser
- Modalidades: normal / sem acentos, tamanho e dificuldade
- Placar opcional: nick + senha (conta criada automaticamente se o nick for novo)
- Ranking top 50 por PPM no Turso

## Setup local

1. Copie o exemplo de env:

```bash
cp .env.example .env.local
```

2. Preencha:

| Variável | Onde pegar |
|---|---|
| `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) |
| `TURSO_DATABASE_URL` | Turso → Database → URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Turso → Database → Tokens |
| `AUTH_SECRET` | Qualquer string longa e aleatória |

3. Instale e rode:

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

As tabelas `users` e `scores` são criadas automaticamente na primeira requisição autenticada/ranking.

## Deploy na Vercel

1. Suba o repo e importe no Vercel
2. Em **Settings → Environment Variables**, adicione as 4 variáveis acima
3. Deploy

Não commite `.env.local`.

## Segurança

A chave Groq que apareceu no código antigo **deve ser revogada/rotacionada** no painel da Groq — ela ficou exposta no chat/código. Gere uma nova e use só em env.

## Auth do placar

Fluxo simples (propositalmente casual):

- Nick novo + senha → cria conta e faz login
- Nick existente + senha correta → login
- Nick existente + senha errada → erro

Sessão fica em cookie httpOnly JWT (`AUTH_SECRET`).
