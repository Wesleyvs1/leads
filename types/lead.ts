export const LEAD_STATUSES = [
  "Pendente",
  "Analisado",
  "Preview gerado",
  "Aprovado",
  "Enviado manualmente",
  "Respondeu",
  "Sem interesse",
  "Descartado",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_PRIORITIES = ["Alta", "Média", "Baixa"] as const;

export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export type MessageVariant =
  | "primeiro-contato"
  | "curta"
  | "consultiva"
  | "direta"
  | "apos-autorizacao";

export type Lead = {
  id: string;
  nome: string;
  telefone: string;
  cidade: string;
  area: string;
  origem: string;
  link: string;
  instagram: string;
  facebook: string;
  maps: string;
  observacoes: string;
  temSite: string;
  prioridade: LeadPriority;
  status: LeadStatus;
  analiseManual: string;
  mensagemGerada: string;
  promptGerado: string;
  dataUltimaAtualizacao: string;
};

export type MessageTemplates = {
  primeiroContato: string;
  aposAutorizacao: string;
  followUpLeve: string;
};

export type LeadDraft = Omit<Lead, "id" | "dataUltimaAtualizacao">;
