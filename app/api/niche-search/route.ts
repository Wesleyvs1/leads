import { NextResponse } from "next/server";
import type { LeadDraft } from "@/types/lead";

export const runtime = "nodejs";
export const maxDuration = 60;

type FirecrawlResult = {
  title?: string;
  description?: string;
  url?: string;
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
    url?: string;
  };
};

type SearchBody = {
  niche?: string;
  region?: string;
  target?: number;
};

const FIRECRAWL_API_URL = process.env.FIRECRAWL_API_URL || "https://api.firecrawl.dev";
const DEFAULT_REGION = "Curitiba e regiao";
const NEARBY_CITIES = [
  "Curitiba",
  "Sao Jose dos Pinhais",
  "Colombo",
  "Pinhais",
  "Araucaria",
  "Campo Largo",
  "Almirante Tamandare",
  "Fazenda Rio Grande",
];

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(10, Math.min(100, Math.round(parsed)));
}

function createSearchQueries(niche: string, region: string) {
  const base = cleanText(`${niche} ${region}`);
  const queries = [
    `${base} contato site instagram`,
    `${base} escritorio telefone`,
    `${base} google maps`,
    `${base} profissionais`,
    ...NEARBY_CITIES.map((city) => `${niche} ${city} contato`),
  ];

  return Array.from(new Set(queries.map(cleanText))).slice(0, 12);
}

function resultUrl(result: FirecrawlResult) {
  return result.url || result.metadata?.sourceURL || result.metadata?.url || "";
}

function resultTitle(result: FirecrawlResult) {
  return cleanText(result.title || result.metadata?.title || resultUrl(result) || "Lead sem nome");
}

function resultDescription(result: FirecrawlResult) {
  return cleanText(result.description || result.metadata?.description || "");
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function guessCity(text: string, fallback: string) {
  const normalized = normalize(text);
  const city = NEARBY_CITIES.find((candidate) => normalized.includes(normalize(candidate)));
  return city || fallback;
}

function leadNameFromTitle(title: string) {
  return cleanText(
    title
      .replace(/\s[-|].*$/g, "")
      .replace(/\b(Google Maps|Instagram|Facebook|LinkedIn)\b/gi, "")
      .replace(/\s+/g, " "),
  );
}

function toDraft(result: FirecrawlResult, niche: string, region: string): LeadDraft {
  const url = resultUrl(result);
  const lowerUrl = url.toLowerCase();
  const title = resultTitle(result);
  const description = resultDescription(result);
  const city = guessCity(`${title} ${description}`, region);
  const draft: LeadDraft = {
    nome: leadNameFromTitle(title),
    telefone: "",
    cidade: city,
    area: niche,
    origem: "Pesquisa IA",
    link: "",
    instagram: "",
    facebook: "",
    maps: "",
    observacoes: cleanText([description, url ? `Fonte: ${url}` : ""].filter(Boolean).join("\n")),
    temSite: lowerUrl.includes("instagram.com") || lowerUrl.includes("facebook.com") ? "Nao detectado" : "Sim",
    prioridade: "Média",
    status: "Pendente",
    analiseManual: "",
    mensagemGerada: "",
    promptGerado: "",
  };

  if (lowerUrl.includes("instagram.com")) {
    draft.instagram = url;
  } else if (lowerUrl.includes("facebook.com") || lowerUrl.includes("fb.com")) {
    draft.facebook = url;
  } else if (lowerUrl.includes("google.") || lowerUrl.includes("maps.app.goo.gl")) {
    draft.maps = url;
  } else {
    draft.link = url;
  }

  return draft;
}

async function searchFirecrawl(query: string, limit: number, apiKey: string) {
  const response = await fetch(`${FIRECRAWL_API_URL}/v2/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit,
      sources: ["web"],
      country: "BR",
      location: "Curitiba, Parana, Brazil",
      timeout: 20000,
      ignoreInvalidURLs: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Firecrawl respondeu com HTTP ${response.status}`);
  }

  const data = await response.json();
  const web = Array.isArray(data?.data?.web) ? data.data.web : [];
  return web as FirecrawlResult[];
}

export async function POST(request: Request) {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Configure FIRECRAWL_API_KEY na Vercel para habilitar a pesquisa IA de nichos.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as SearchBody;
  const niche = cleanText(body.niche || "");
  const region = cleanText(body.region || DEFAULT_REGION);
  const target = toNumber(body.target, 100);

  if (niche.length < 3) {
    return NextResponse.json(
      { error: "Informe um nicho com pelo menos 3 caracteres." },
      { status: 400 },
    );
  }

  const queries = createSearchQueries(niche, region);
  const perQueryLimit = Math.max(10, Math.ceil(target / Math.min(queries.length, 5)));
  const seen = new Set<string>();
  const drafts: LeadDraft[] = [];

  const batches = await Promise.allSettled(
    queries.map((query) => searchFirecrawl(query, perQueryLimit, apiKey)),
  );

  for (const batch of batches) {
    if (batch.status !== "fulfilled") {
      continue;
    }

    for (const result of batch.value) {
      const url = resultUrl(result);
      const title = resultTitle(result);
      const key = normalize(url || title);

      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);
      drafts.push(toDraft(result, niche, region));

      if (drafts.length >= target) {
        break;
      }
    }

    if (drafts.length >= target) {
      break;
    }
  }

  return NextResponse.json({
    leads: drafts,
    meta: {
      found: drafts.length,
      target,
      queries: queries.length,
      warning:
        drafts.length < target
          ? `Foram encontrados ${drafts.length} resultados unicos. Tente um nicho mais amplo ou outra regiao para chegar em ${target}.`
          : "",
    },
  });
}
