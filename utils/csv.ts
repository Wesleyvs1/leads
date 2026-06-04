import type { Lead, LeadDraft } from "@/types/lead";
import { emptyLeadDraft, suggestPriority, toLead } from "@/utils/lead";

type ParsedField =
  | keyof LeadDraft
  | "contatoPublico"
  | "linkOndeEncontrar"
  | "ignore";

function normalizeHeader(header: string) {
  return header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function countDelimiter(line: string, delimiter: string) {
  let count = 0;
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && insideQuotes && next === '"') {
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      count += 1;
    }
  }

  return count;
}

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const candidates = [",", ";", "\t", "|"];
  const best = candidates
    .map((delimiter) => ({ delimiter, count: countDelimiter(firstLine, delimiter) }))
    .sort((a, b) => b.count - a.count)[0];

  return best?.delimiter || ",";
}

function parseDelimitedRows(text: string) {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(current.trim());
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some((value) => value.length > 0)) {
    rows.push(row);
  }

  return rows;
}

const fieldMap: Record<string, ParsedField> = {
  "": "ignore",
  n: "ignore",
  numero: "ignore",
  nome: "nome",
  nomeperfil: "nome",
  perfil: "nome",
  profissional: "nome",
  advogado: "nome",
  advogada: "nome",
  telefone: "telefone",
  celular: "telefone",
  whatsapp: "telefone",
  contato: "contatoPublico",
  contatopublico: "contatoPublico",
  cidade: "cidade",
  area: "area",
  areaaparente: "area",
  atuacao: "area",
  areadeatuacao: "area",
  origem: "origem",
  link: "link",
  url: "linkOndeEncontrar",
  linkondeencontrar: "linkOndeEncontrar",
  linkperfil: "linkOndeEncontrar",
  perfilurl: "linkOndeEncontrar",
  instagram: "instagram",
  facebook: "facebook",
  maps: "maps",
  googlemaps: "maps",
  observacoes: "observacoes",
  observacao: "observacoes",
  observacaoabordagem: "observacoes",
  abordagem: "observacoes",
  temsite: "temSite",
  sitedetectado: "temSite",
  sinaldesemsite: "temSite",
  semsite: "temSite",
  prioridade: "prioridade",
  status: "status",
  analisemanual: "analiseManual",
  mensagemgerada: "mensagemGerada",
  promptgerado: "promptGerado",
};

export function parseLeadsCsv(text: string): Lead[] {
  const rows = parseDelimitedRows(text.replace(/^\uFEFF/, ""));

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => fieldMap[normalizeHeader(header)] || "ignore");

  return rows.slice(1).map((row) => {
    const draft: LeadDraft = { ...emptyLeadDraft };

    row.forEach((value, index) => {
      const field = headers[index];
      if (!field || field === "ignore" || !value.trim()) {
        return;
      }

      if (field === "prioridade") {
        const normalized = value.toLowerCase();
        draft.prioridade = normalized.startsWith("alta")
          ? "Alta"
          : normalized.startsWith("baix")
            ? "Baixa"
            : "Média";
        return;
      }

      if (field === "contatoPublico") {
        applyPublicContact(draft, value);
        return;
      }

      if (field === "linkOndeEncontrar") {
        applyLink(draft, value);
        return;
      }

      draft[field] = value as never;
    });

    draft.prioridade = draft.prioridade || suggestPriority(draft);
    return toLead(draft);
  });
}

function applyPublicContact(draft: LeadDraft, value: string) {
  const phone = value.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}/)?.[0] || "";

  if (phone) {
    draft.telefone = phone;
    return;
  }

  draft.observacoes = joinNotes(draft.observacoes, `Contato publico: ${value}`);
}

function applyLink(draft: LeadDraft, value: string) {
  const normalized = value.toLowerCase();

  if (normalized.includes("instagram.com")) {
    draft.instagram = value;
    return;
  }

  if (normalized.includes("facebook.com") || normalized.includes("fb.com")) {
    draft.facebook = value;
    return;
  }

  if (normalized.includes("google.") || normalized.includes("maps.app.goo.gl")) {
    draft.maps = value;
    return;
  }

  draft.link = value;
}

function joinNotes(current: string, next: string) {
  return current ? `${current}\n${next}` : next;
}

function escapeCsv(value: string) {
  const safe = value ?? "";
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replaceAll('"', '""')}"`;
  }
  return safe;
}

export function leadsToCsv(leads: Lead[]) {
  const columns: Array<keyof Lead> = [
    "nome",
    "telefone",
    "cidade",
    "area",
    "origem",
    "link",
    "instagram",
    "facebook",
    "maps",
    "observacoes",
    "temSite",
    "prioridade",
    "status",
    "analiseManual",
    "mensagemGerada",
    "promptGerado",
    "dataUltimaAtualizacao",
  ];

  const rows = [
    columns.join(","),
    ...leads.map((lead) => columns.map((column) => escapeCsv(String(lead[column] || ""))).join(",")),
  ];

  return rows.join("\n");
}
