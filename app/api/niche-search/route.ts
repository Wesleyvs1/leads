import { NextResponse } from "next/server";
import type { LeadDraft } from "@/types/lead";

export const runtime = "nodejs";
export const maxDuration = 60;

type FirecrawlResult = {
  title?: string;
  description?: string;
  url?: string;
  markdown?: string;
  links?: string[];
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
const CONTACT_ENRICH_LIMIT = 28;
const VALID_BRAZIL_DDDS = new Set([
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "21",
  "22",
  "24",
  "27",
  "28",
  "31",
  "32",
  "33",
  "34",
  "35",
  "37",
  "38",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
  "49",
  "51",
  "53",
  "54",
  "55",
  "61",
  "62",
  "63",
  "64",
  "65",
  "66",
  "67",
  "68",
  "69",
  "71",
  "73",
  "74",
  "75",
  "77",
  "79",
  "81",
  "82",
  "83",
  "84",
  "85",
  "86",
  "87",
  "88",
  "89",
  "91",
  "92",
  "93",
  "94",
  "95",
  "96",
  "97",
  "98",
  "99",
]);
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
  const socialNoiseFilter =
    "-site:instagram.com/p -site:instagram.com/reel -site:instagram.com/stories -site:instagram.com/explore";
  const queries = [
    `${base} instagram whatsapp telefone ${socialNoiseFilter}`,
    `${base} facebook whatsapp telefone`,
    `${base} google maps telefone whatsapp ${socialNoiseFilter}`,
    `${base} guia telefone whatsapp ${socialNoiseFilter}`,
    `${base} diretório telefone whatsapp ${socialNoiseFilter}`,
    `site:wa.me ${base}`,
    `site:api.whatsapp.com/send ${base}`,
    `site:linktr.ee ${base} whatsapp`,
    `site:bio.link ${base} whatsapp`,
    `site:instagram.com ${base} whatsapp ${socialNoiseFilter}`,
    `site:facebook.com ${base} telefone whatsapp`,
    `site:solutudo.com.br ${base} telefone`,
    `site:guiamais.com.br ${base} telefone`,
    `site:apontador.com.br ${base} telefone`,
    ...NEARBY_CITIES.flatMap((city) => [
      `site:instagram.com "${niche}" "${city}" "WhatsApp" ${socialNoiseFilter}`,
      `site:facebook.com "${niche}" "${city}" "WhatsApp"`,
      `"${niche}" "${city}" "sem site" "WhatsApp"`,
      `"${niche}" "${city}" "Instagram" "WhatsApp"`,
      `${niche} ${city} google maps telefone whatsapp ${socialNoiseFilter}`,
    ]),
  ];

  return Array.from(new Set(queries.map(cleanText))).slice(0, 24);
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

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) {
    return "";
  }

  const withoutCountry = digits.startsWith("55") ? digits.slice(2) : digits;
  if (withoutCountry.length < 10 || withoutCountry.length > 11) {
    return "";
  }

  const ddd = withoutCountry.slice(0, 2);
  const firstSubscriberDigit = withoutCountry[2];
  if (!VALID_BRAZIL_DDDS.has(ddd) || !/[2-9]/.test(firstSubscriberDigit)) {
    return "";
  }

  return withoutCountry.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3");
}

function phoneForWhatsapp(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function phoneDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits.slice(2) : digits;
}

function extractPhone(text: string) {
  const matches =
    text.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-.\s]?\d{4}/g) || [];

  for (const match of matches) {
    const normalized = normalizePhone(match);
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function extractWhatsappLink(text: string) {
  const direct = text.match(/https?:\/\/(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\/[^\s)"'<]+/i)?.[0];
  if (direct) {
    return direct.replace(/[.,;]+$/, "");
  }

  const phone = text.match(/(?:phone=|wa\.me\/)(55\d{10,11})/i)?.[1];
  if (phone) {
    return `https://wa.me/${phone}`;
  }

  return "";
}

function hostName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isLowValueSocialUrl(url: string) {
  const lowerUrl = url.toLowerCase();
  return [
    "instagram.com/p/",
    "instagram.com/reel/",
    "instagram.com/reels/",
    "/reels/",
    "instagram.com/stories/",
    "instagram.com/explore/",
    "instagram.com/tv/",
    "facebook.com/reel/",
    "facebook.com/watch/",
    "facebook.com/photo",
    "facebook.com/story",
    "facebook.com/groups/",
    "/posts/",
    "tiktok.com/",
    "youtube.com/shorts/",
  ].some((pattern) => lowerUrl.includes(pattern));
}

function isSocialProfileUrl(url: string) {
  const lowerUrl = url.toLowerCase();
  return (
    (lowerUrl.includes("instagram.com/") || lowerUrl.includes("facebook.com/")) &&
    !isLowValueSocialUrl(lowerUrl)
  );
}

function isMapsUrl(url: string) {
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes("google.com/maps") ||
    lowerUrl.includes("maps.app.goo.gl") ||
    lowerUrl.includes("goo.gl/maps")
  );
}

function isWhatsappUrl(url: string) {
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes("wa.me/") ||
    lowerUrl.includes("api.whatsapp.com/send") ||
    lowerUrl.includes("web.whatsapp.com/send")
  );
}

function isLinkHubUrl(url: string) {
  const host = hostName(url);
  return [
    "linktr.ee",
    "bio.link",
    "beacons.ai",
    "taplink.cc",
    "solo.to",
    "lnk.bio",
    "instabio.cc",
    "about.me",
  ].some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function isDirectoryUrl(url: string) {
  const host = hostName(url);
  return [
    "google.com",
    "maps.google.com",
    "solutudo.com.br",
    "guiamais.com.br",
    "apontador.com.br",
    "telelistas.net",
    "empresasdobrasil.com",
    "consultas.plus",
    "casamentos.com.br",
    "habitissimo.com.br",
    "homify.com.br",
    "archdaily.com.br",
    "br.houzz.com",
  ].some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function isNoSiteLeadSource(url: string) {
  return (
    isSocialProfileUrl(url) ||
    isMapsUrl(url) ||
    isWhatsappUrl(url) ||
    isLinkHubUrl(url) ||
    isDirectoryUrl(url)
  );
}

function mentionsNoSite(text: string) {
  const normalized = normalize(text);
  return [
    "sem site",
    "site nao encontrado",
    "site não encontrado",
    "nao possui site",
    "não possui site",
    "apenas instagram",
    "somente instagram",
  ].some((signal) => normalized.includes(normalize(signal)));
}

function isProviderNoise(text: string) {
  const normalized = normalize(text);
  return [
    "criacao de sites",
    "criação de sites",
    "desenvolvimento de sites",
    "site para arquiteto",
    "site para arquitetos",
    "marketing digital",
    "agencia de marketing",
    "agência de marketing",
    "landing page",
    "seo para",
    "trafego pago",
    "tráfego pago",
    "informatica",
    "informática",
    "sistema para",
    "software para",
    "vagas",
    "vaga:",
    "emprego",
    "montador de moveis",
    "montador de móveis",
  ].some((signal) => normalized.includes(normalize(signal)));
}

function contactScore(draft: LeadDraft) {
  const text = `${draft.link} ${draft.instagram} ${draft.facebook} ${draft.maps} ${draft.observacoes}`;
  let score = 0;

  if (draft.telefone) {
    score += 100;
  }

  if (extractWhatsappLink(text)) {
    score += 120;
  }

  if (draft.maps) {
    score += 20;
  }

  if (draft.link && isWhatsappUrl(draft.link)) {
    score += 35;
  }

  if (draft.maps || draft.instagram || draft.facebook) {
    score += 20;
  }

  if (draft.temSite === "Sim") {
    score -= 250;
  }

  if (mentionsNoSite(draft.observacoes)) {
    score += 45;
  }

  return score;
}

function canonicalUrl(value: string) {
  return value.toLowerCase().replace(/\/$/, "").trim();
}

function dedupeKey(draft: LeadDraft) {
  const phone = phoneDigits(draft.telefone);
  if (phone.length >= 10) {
    return `phone:${phone}`;
  }

  const profile = draft.instagram || draft.facebook || draft.maps || draft.link;
  if (profile) {
    return `url:${canonicalUrl(profile)}`;
  }

  return `name:${normalize(`${draft.nome} ${draft.cidade}`)}`;
}

function dedupeDrafts(drafts: LeadDraft[]) {
  const seen = new Set<string>();
  return drafts.filter((draft) => {
    const key = dedupeKey(draft);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
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

function hostNameFromUrl(url: string) {
  return hostName(url).split(".")[0]?.replaceAll("-", " ") || "";
}

function leadName(result: FirecrawlResult) {
  const title = leadNameFromTitle(resultTitle(result));
  const generic = ["contato", "fale conosco", "whatsapp", "home", "inicio", "início"];
  if (generic.includes(normalize(title))) {
    return cleanText(hostNameFromUrl(resultUrl(result)) || title || "Lead sem nome");
  }
  return title || cleanText(hostNameFromUrl(resultUrl(result)) || "Lead sem nome");
}

function toDraft(result: FirecrawlResult, niche: string, region: string): LeadDraft {
  const url = resultUrl(result);
  const lowerUrl = url.toLowerCase();
  const title = resultTitle(result);
  const description = resultDescription(result);
  const contactText = `${title} ${description} ${url}`;
  const phone = extractPhone(contactText);
  const whatsappLink = extractWhatsappLink(contactText);
  const city = guessCity(`${title} ${description}`, region);
  const draft: LeadDraft = {
    nome: leadName(result),
    telefone: phone,
    cidade: city,
    area: niche,
    origem: "Pesquisa IA",
    link: "",
    instagram: "",
    facebook: "",
    maps: "",
    observacoes: cleanText(
      [
        description,
        whatsappLink ? `WhatsApp: ${whatsappLink}` : "",
        url ? `Fonte: ${url}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    temSite: isNoSiteLeadSource(url) || mentionsNoSite(contactText) ? "Nao detectado" : "Sim",
    prioridade: "Média",
    status: "Pendente",
    analiseManual: "",
    mensagemGerada: "",
    promptGerado: "",
  };

  if (whatsappLink) {
    draft.link = whatsappLink;
  } else if (lowerUrl.includes("instagram.com")) {
    draft.instagram = url;
  } else if (lowerUrl.includes("facebook.com") || lowerUrl.includes("fb.com")) {
    draft.facebook = url;
  } else if (isMapsUrl(url)) {
    draft.maps = url;
  } else {
    draft.link = url;
  }

  return draft;
}

function enrichDraftWithContact(draft: LeadDraft, text: string) {
  const phone = draft.telefone || extractPhone(text);
  const whatsappLink = extractWhatsappLink(text);
  const notes = [draft.observacoes];

  if (phone) {
    draft.telefone = phone;
  }

  if (whatsappLink && !draft.observacoes.includes(whatsappLink)) {
    notes.push(`WhatsApp: ${whatsappLink}`);
    if (!draft.link || isSocialProfileUrl(draft.link)) {
      draft.link = whatsappLink;
    }
  } else if (phone) {
    const waMe = `https://wa.me/${phoneForWhatsapp(phone)}`;
    if (!draft.observacoes.includes(waMe)) {
      notes.push(`WhatsApp sugerido: ${waMe}`);
    }
  }

  draft.observacoes = cleanText(notes.filter(Boolean).join("\n"));
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

async function scrapeFirecrawl(url: string, apiKey: string) {
  const response = await fetch(`${FIRECRAWL_API_URL}/v2/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "links"],
      onlyMainContent: false,
      timeout: 20000,
      location: {
        country: "BR",
        languages: ["pt-BR"],
      },
    }),
  });

  if (!response.ok) {
    return "";
  }

  const data = await response.json();
  const page = data?.data || {};
  const markdown = typeof page.markdown === "string" ? page.markdown : "";
  const links = Array.isArray(page.links) ? page.links.join("\n") : "";
  return `${markdown}\n${links}`;
}

async function enrichContactDetails(drafts: LeadDraft[], apiKey: string) {
  const candidates = drafts
    .filter((draft) => !draft.telefone)
    .filter((draft) => draft.link && !draft.link.includes("wa.me/"))
    .filter((draft) => !isSocialProfileUrl(draft.link))
    .filter((draft) => draft.temSite !== "Sim")
    .slice(0, CONTACT_ENRICH_LIMIT);

  const enriched = await Promise.allSettled(
    candidates.map(async (draft) => {
      const pageText = await scrapeFirecrawl(draft.link, apiKey);
      if (!pageText) {
        return draft;
      }
      return enrichDraftWithContact(draft, pageText);
    }),
  );

  enriched.forEach((result) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return null;
  });

  return drafts;
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
  const perQueryLimit = Math.max(8, Math.ceil((target * 1.8) / Math.min(queries.length, 8)));
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

      if (!key || seen.has(key) || isLowValueSocialUrl(url)) {
        continue;
      }

      const sourceText = `${title} ${resultDescription(result)} ${url}`;
      if (!isNoSiteLeadSource(url) || isProviderNoise(sourceText)) {
        continue;
      }

      seen.add(key);
      drafts.push(enrichDraftWithContact(toDraft(result, niche, region), sourceText));

      if (drafts.length >= target * 2) {
        break;
      }
    }

    if (drafts.length >= target * 2) {
      break;
    }
  }

  await enrichContactDetails(drafts, apiKey);

  const noSiteDrafts = dedupeDrafts(drafts.filter((draft) => draft.temSite !== "Sim"));
  const sortedDrafts = noSiteDrafts
    .sort((a, b) => contactScore(b) - contactScore(a))
    .slice(0, target);
  const withPhone = sortedDrafts.filter((draft) => draft.telefone).length;
  const withWhatsapp = sortedDrafts.filter((draft) =>
    extractWhatsappLink(`${draft.link} ${draft.observacoes}`),
  ).length;
  const withoutSite = sortedDrafts.filter((draft) => draft.temSite !== "Sim").length;

  return NextResponse.json({
    leads: sortedDrafts,
    meta: {
      found: sortedDrafts.length,
      target,
      queries: queries.length,
      withPhone,
      withWhatsapp,
      withoutSite,
      warning:
        sortedDrafts.length < target
          ? `Foram encontrados ${sortedDrafts.length} leads sem site detectado. Melhor retornar menos leads bons do que incluir empresas que ja tem site.`
          : "",
    },
  });
}
