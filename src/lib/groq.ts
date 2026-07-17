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
  "uma feira de bairro em uma manhã de domingo",
  "o aprendizado de consertar uma bicicleta",
  "um jardim que muda depois da chuva",
  "a rotina silenciosa de uma biblioteca",
  "uma noite de jogos de tabuleiro entre amigos",
  "o preparo de pão caseiro",
  "vizinhos se ajudando durante uma queda de energia",
  "o começo de um novo passatempo",
  "as mudanças de uma árvore ao longo das estações",
  "um mutirão para recuperar uma praça",
  "a amizade criada em uma quadra de bairro",
  "um pequeno gesto de gentileza no transporte público",
  "fotografia com câmeras antigas",
  "o ensaio de uma banda amadora",
  "os detalhes de uma casa antiga",
  "a criação de peças de cerâmica",
  "a importância das abelhas para as plantas",
  "a relação entre sono, sonhos e memória",
  "como cheiros despertam lembranças",
  "gírias e mudanças na língua portuguesa",
  "padrões matemáticos encontrados na natureza",
  "como se formam as tempestades",
  "a acústica de uma sala de música",
  "formas simples de economizar energia em casa",
  "acessibilidade nos espaços públicos",
  "a curiosidade como ferramenta de aprendizado",
  "privacidade e hábitos seguros na internet",
  "robôs ajudando no trabalho agrícola",
  "a história da impressão de livros",
  "como os mapas são criados",
  "efeitos práticos usados no cinema",
  "dança, ritmo e coordenação",
  "o processo de escrever um poema",
  "reciclagem de aparelhos eletrônicos",
  "a recuperação de uma floresta degradada",
  "a vida escondida dentro de uma caverna",
  "como animais se adaptam ao deserto",
  "a migração das aves",
  "a inteligência e o treinamento dos cães",
  "capivaras vivendo perto de áreas urbanas",
  "o caminho do café da lavoura até a xícara",
  "a produção de chocolate a partir do cacau",
  "cafés da manhã típicos de diferentes regiões brasileiras",
  "artesanato feito com materiais reaproveitados",
  "uma horta comunitária",
  "o funcionamento de um relógio mecânico",
  "a restauração de um móvel antigo",
  "uma aula de culinária em família",
  "o trabalho de quem cuida de um parque",
  "uma descoberta interessante em um museu",
  "o hábito de observar o céu no quintal",
  "a organização de uma festa de bairro",
  "o desafio de aprender um instrumento musical",
  "como as pontes suportam tanto peso",
  "a comunicação entre árvores de uma floresta",
  "o uso da criatividade para resolver problemas comuns",
  "uma competição amigável de quebra-cabeças",
  "o valor de ouvir histórias de pessoas mais velhas",
  "as pequenas decisões que melhoram uma cidade",
  "um dia de trabalho em uma oficina",
];

const WRITING_STYLES = [
  "Explique uma curiosidade concreta com clareza.",
  "Descreva uma cena como se o leitor estivesse presente.",
  "Conte uma pequena transformação com começo, meio e fim.",
  "Apresente uma reflexão prática, sem frases motivacionais.",
  "Mostre um detalhe pouco percebido desse assunto.",
  "Narre uma situação cotidiana de forma leve e natural.",
];

const DETAIL_WORDS = [
  "janela",
  "caderno",
  "chuva",
  "relógio",
  "café",
  "praça",
  "semente",
  "bicicleta",
  "luz",
  "madeira",
  "música",
  "folha",
  "chave",
  "vento",
  "tinta",
  "pedra",
  "pássaro",
  "mesa",
  "caminho",
  "silêncio",
];

let themeBag: string[] = [];

function shuffled<T>(items: readonly T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function nextTheme() {
  if (themeBag.length === 0) themeBag = shuffled(THEMES);
  return themeBag.pop() ?? THEMES[0];
}

function randomItem<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

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

  const theme = nextTheme();
  const style = randomItem(WRITING_STYLES);
  const [firstDetail, secondDetail] = shuffled(DETAIL_WORDS).slice(0, 2);
  const prompt = `Gere um texto em português do Brasil.
TEMA OBRIGATÓRIO: ${theme}.
Abordagem: ${style}
Inclua naturalmente estes dois elementos: "${firstDetail}" e "${secondDetail}".
Não troque o tema por uma cidade, país ou cultura estrangeira.
ASSUNTOS PROIBIDOS: São Paulo, Coreia, Tailândia, barcos, navios, alto-mar, polícia, crimes, detetives e investigações.
Evite clichês, frases motivacionais, introduções genéricas e os nomes João, Maria ou Pedro.
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
          temperature: 1.05,
          top_p: 0.95,
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
