import type { Lead, LeadDraft, LeadPriority } from "@/types/lead";

export const emptyLeadDraft: LeadDraft = {
  nome: "",
  telefone: "",
  cidade: "",
  area: "",
  origem: "",
  link: "",
  instagram: "",
  facebook: "",
  maps: "",
  observacoes: "",
  temSite: "",
  prioridade: "Média",
  status: "Pendente",
  analiseManual: "",
  mensagemGerada: "",
  promptGerado: "",
};

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `lead-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function siteNotFound(temSite: string) {
  const normalized = normalize(temSite);
  return !normalized || ["nao", "não", "false", "0", "sem site"].includes(normalized);
}

export function mainLink(lead: Lead) {
  return lead.link || lead.instagram || lead.facebook || lead.maps;
}

export function cleanPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function isPhoneComplete(phone: string) {
  const cleaned = cleanPhone(phone);
  const withoutCountry = cleaned.startsWith("55") ? cleaned.slice(2) : cleaned;
  return withoutCountry.length >= 10;
}

export function buildWaMeLink(phone: string, message: string) {
  if (!isPhoneComplete(phone)) {
    return "";
  }

  const cleaned = cleanPhone(phone);
  const withCountry = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

export function suggestPriority(input: Partial<Lead>): LeadPriority {
  const hasContact = Boolean(input.telefone?.trim());
  const hasSocial = Boolean(input.instagram?.trim() || input.facebook?.trim());
  const noSite = siteNotFound(input.temSite || "");
  const text = normalize(
    `${input.nome || ""} ${input.origem || ""} ${input.observacoes || ""}`,
  );
  const looksLarge = ["sociedade", "associados", "escritorio", "equipe"].some((term) =>
    text.includes(term),
  );
  const looksSolo = ["dra", "dr.", "dr ", "autonomo", "autônomo"].some((term) =>
    text.includes(term),
  );

  if (hasContact && noSite && hasSocial && looksSolo) {
    return "Alta";
  }

  if (looksLarge || !noSite) {
    return "Baixa";
  }

  if (hasContact || hasSocial) {
    return "Média";
  }

  return "Baixa";
}

export function toLead(draft: LeadDraft): Lead {
  return {
    ...draft,
    id: createId(),
    prioridade: draft.prioridade || suggestPriority(draft),
    dataUltimaAtualizacao: new Date().toISOString(),
  };
}

export function touchLead(lead: Lead): Lead {
  return {
    ...lead,
    dataUltimaAtualizacao: new Date().toISOString(),
  };
}
