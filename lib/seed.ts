import type { Lead, MessageTemplates } from "@/types/lead";

export const DEFAULT_TEMPLATES: MessageTemplates = {
  primeiroContato:
    "Olá, boa tarde, Dr(a). [NOME]. Tudo bem?\n\nEncontrei seu perfil profissional e vi uma oportunidade de melhorar sua presença digital com uma página mais profissional e objetiva.\n\nPreparei uma prévia visual de como poderia ficar um site para seu perfil. Posso te enviar para você avaliar sem compromisso?",
  aposAutorizacao:
    "Perfeito, Dr(a). [NOME].\n\nFiz uma prévia simples com base no seu posicionamento profissional e área de atuação aparente. A ideia é transmitir mais confiança, organizar suas informações e facilitar o contato pelo WhatsApp.\n\nSegue a prévia.",
  followUpLeve:
    "Olá, Dr(a). [NOME], tudo bem?\n\nConseguiu ver a prévia que te enviei? A ideia seria apenas te mostrar uma possibilidade de presença digital mais profissional, sem compromisso.",
};

const now = () => new Date().toISOString();

export const SAMPLE_LEADS: Lead[] = [
  {
    id: "seed-ana-martins",
    nome: "Dra. Ana Martins",
    telefone: "(41) 99999-1001",
    cidade: "Curitiba",
    area: "Direito de Família",
    origem: "Pesquisa manual",
    link: "",
    instagram: "https://instagram.com/exemplo_ana",
    facebook: "",
    maps: "",
    observacoes: "Lead fictício para teste.",
    temSite: "não",
    prioridade: "Alta",
    status: "Pendente",
    analiseManual: "",
    mensagemGerada: "",
    promptGerado: "",
    dataUltimaAtualizacao: now(),
  },
  {
    id: "seed-rafael-souza",
    nome: "Dr. Rafael Souza",
    telefone: "(41) 98888-2002",
    cidade: "São José dos Pinhais",
    area: "Direito Trabalhista",
    origem: "Lista fictícia",
    link: "",
    instagram: "",
    facebook: "https://facebook.com/exemplo_rafael",
    maps: "",
    observacoes: "Lead fictício para teste.",
    temSite: "",
    prioridade: "Média",
    status: "Pendente",
    analiseManual: "",
    mensagemGerada: "",
    promptGerado: "",
    dataUltimaAtualizacao: now(),
  },
  {
    id: "seed-camila-rocha",
    nome: "Dra. Camila Rocha",
    telefone: "(41) 97777-3003",
    cidade: "Pinhais",
    area: "Direito Previdenciário",
    origem: "Pesquisa manual",
    link: "",
    instagram: "https://instagram.com/exemplo_camila",
    facebook: "",
    maps: "",
    observacoes: "Lead fictício para teste.",
    temSite: "não",
    prioridade: "Alta",
    status: "Pendente",
    analiseManual: "",
    mensagemGerada: "",
    promptGerado: "",
    dataUltimaAtualizacao: now(),
  },
];
