import type { Difficulty, GameMode, TextLength } from "./types";

const LENGTH_MAP: Record<TextLength, string> = {
  curto:
    "MÁXIMO ABSOLUTO DE 20 PALAVRAS. Limite-se a apenas 1 ou 2 frases curtas. Pare de escrever imediatamente após isso.",
  médio: "MÁXIMO ABSOLUTO DE 50 PALAVRAS. Cerca de 3 a 4 frases.",
  longo: "MÁXIMO ABSOLUTO DE 100 PALAVRAS. Um parágrafo completo.",
};

const DIFFICULTY_MAP: Record<Difficulty, string> = {
  fáceis:
    "Use APENAS palavras muito curtas, simples e comuns. Nível de leitura de criança. PROIBIDO usar nomes próprios, nomes estrangeiros ou palavras difíceis.",
  "dia a dia":
    "Vocabulário comum do cotidiano de um brasileiro. Conversação normal. É ESTRITAMENTE PROIBIDO usar nomes estrangeiros históricos, nomes de cientistas ou termos técnicos complexos. Use apenas palavras corriqueiras do português.",
  difíceis:
    "Vocabulário rico, avançado e erudito. Palavras longas, jargões, termos técnicos e nomes próprios estrangeiros ou históricos são bem-vindos.",
};

const MAX_WORDS: Record<TextLength, number> = {
  curto: 22,
  médio: 55,
  longo: 110,
};

const THEMES = [
  "tecnologia e futuro",
  "exploração espacial",
  "um mistério policial antigo",
  "a vida em uma metrópole agitada",
  "dicas de produtividade",
  "a evolução dos esportes",
  "animais exóticos da selva",
  "filosofia e o tempo",
  "culinária de outro país",
  "uma aventura em alto mar",
  "invenções que mudaram o mundo",
  "mitologia e lendas",
];

const FALLBACK =
  "Houve um erro ao conectar com a inteligência artificial. Este é um texto padrão de segurança para que você possa continuar praticando sua digitação sem interrupções maiores. Tente gerar um novo texto mais tarde.";

function applyMode(text: string, mode: GameMode) {
  if (mode !== "sem_acentos") return text;

  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]|_/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function clampWords(text: string, length: TextLength) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= MAX_WORDS[length]) return text;

  let clipped = words.slice(0, MAX_WORDS[length]).join(" ");
  if (!/[.!?]$/.test(clipped)) clipped += ".";
  return clipped;
}

export async function generateTypingText(
  mode: GameMode,
  length: TextLength,
  difficulty: Difficulty,
) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY não configurada.");
  }

  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
  const prompt = `Gere um texto em português do Brasil.
Tema: ${theme}. Seja criativo e evite clichês ou repetições.
Instrução EXTREMA de Vocabulário: ${DIFFICULTY_MAP[difficulty]}
Tamanho: ${LENGTH_MAP[length]} É proibido ultrapassar esse limite.
O texto deve ser coeso, contínuo, sem quebras de linha e formar parágrafos lógicos.
MUITO IMPORTANTE: Retorne APENAS o texto puro. Não inclua aspas no início ou fim, não inclua introduções como "Aqui está o texto", não inclua formatação markdown. Apenas as palavras que serão digitadas.`;

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Groq respondeu ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    let generated =
      data.choices?.[0]?.message?.content?.trim() ?? FALLBACK;

    if (generated.startsWith('"') && generated.endsWith('"')) {
      generated = generated.slice(1, -1);
    }

    generated = clampWords(generated, length);
    return applyMode(generated, mode);
  } catch {
    return applyMode(FALLBACK, mode);
  }
}
