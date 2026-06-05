import type { Lead, MessageTemplates, MessageVariant } from "@/types/lead";

function displayName(lead: Pick<Lead, "nome">) {
  return lead.nome.trim();
}

function displayArea(lead: Pick<Lead, "area">) {
  return lead.area.trim();
}

function greeting(lead: Lead) {
  const name = displayName(lead);
  return name ? `Ola, boa tarde, ${name}. Tudo bem?` : "Ola, boa tarde. Tudo bem?";
}

export function fillTemplate(template: string, lead: Lead) {
  return template
    .replaceAll("[NOME]", displayName(lead) || "Negocio Profissional")
    .replaceAll("[AREA]", displayArea(lead) || "servicos profissionais")
    .replaceAll("[CIDADE]", lead.cidade.trim() || "Curitiba e Regiao");
}

export function generateMessage(lead: Lead, variant: MessageVariant = "primeiro-contato") {
  const name = displayName(lead);
  const area = displayArea(lead);
  const areaLine = area
    ? `, objetiva e alinhada a sua atuacao em ${area}`
    : ", objetiva e alinhada a sua presenca profissional";

  if (variant === "curta") {
    return `${greeting(lead)}\n\nEncontrei seu perfil profissional e preparei uma ideia simples de previa visual para um site mais profissional e claro${area ? ` na area de ${area}` : ""}.\n\nPosso te enviar para voce avaliar sem compromisso?`;
  }

  if (variant === "consultiva") {
    return `${greeting(lead)}\n\nVi seu perfil profissional e percebi que uma pagina propria poderia ajudar a organizar melhor suas informacoes, servicos e formas de contato.\n\nPreparei uma previa visual com uma abordagem sobria e profissional${area ? ` para ${area}` : ""}. Posso te enviar para voce avaliar sem compromisso?`;
  }

  if (variant === "direta") {
    return `${greeting(lead)}\n\nPreparei uma previa visual de site profissional para seu perfil${area ? ` em ${area}` : ""}, com foco em apresentacao clara e contato pelo WhatsApp.\n\nPosso te enviar para avaliacao, sem compromisso?`;
  }

  if (variant === "apos-autorizacao") {
    return `Perfeito${name ? `, ${name}` : ""}.\n\nFiz uma previa simples com base no seu posicionamento profissional${area ? ` e atuacao em ${area}` : ""}. A ideia e transmitir mais confianca, organizar suas informacoes e facilitar o contato pelo WhatsApp.\n\nSegue a previa.`;
  }

  return `${greeting(lead)}\n\nEncontrei seu perfil profissional e percebi uma oportunidade de melhorar sua presenca digital com uma pagina mais profissional${areaLine}.\n\nPreparei uma ideia de previa visual de como poderia ficar um site profissional para seu perfil, com foco em transmitir mais confianca, organizar suas informacoes e facilitar o contato pelo WhatsApp.\n\nPosso te enviar para voce avaliar sem compromisso?`;
}

export function generateTemplateMessage(
  lead: Lead,
  templates: MessageTemplates,
  key: keyof MessageTemplates,
) {
  return fillTemplate(templates[key], lead);
}

type PromptProfile = {
  marketLabel: string;
  objective: string;
  styleBullets: string[];
  palette: string[];
  services: string[];
  differentials: string[];
  extraRules: string[];
};

function normalizeArea(area: string) {
  return area
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function promptProfile(area: string): PromptProfile {
  const normalized = normalizeArea(area);

  if (["veterin", "pet", "animal", "clinica animal"].some((term) => normalized.includes(term))) {
    return {
      marketLabel: "atendimento veterinario e cuidados pet",
      objective:
        "Transmitir cuidado, acolhimento, confianca clinica, clareza nos servicos e facilitar o agendamento pelo WhatsApp.",
      styleBullets: [
        "Veterinario moderno",
        "Acolhedor",
        "Limpo",
        "Profissional",
        "Amigavel sem parecer infantil",
        "Visual premium com sensacao de cuidado",
        "Nao apelativo",
      ],
      palette: [
        "Verde suave",
        "Branco",
        "Cinza claro",
        "Azul petroleo discreto",
        "Pequenos detalhes em terracota ou areia",
      ],
      services: [
        "consultas veterinarias",
        "vacinas",
        "exames",
        "banho e tosa se fizer sentido",
        "atendimento de urgencia se fizer sentido",
      ],
      differentials: [
        "atendimento cuidadoso",
        "ambiente acolhedor",
        "clareza nas orientacoes",
        "facilidade para agendar",
      ],
      extraRules: [
        "Usar imagens ou cards que remetam a pets, clinica veterinaria, cuidado animal e agendamento",
        "Manter toda a linguagem focada em atendimento veterinario e cuidado pet",
        "Nao sugerir cura garantida ou promessas medicas",
      ],
    };
  }

  if (["advog", "jurid", "direito", "oab"].some((term) => normalized.includes(term))) {
    return {
      marketLabel: "servicos juridicos",
      objective:
        "Transmitir confianca, autoridade profissional, clareza nas informacoes e facilitar o contato pelo WhatsApp.",
      styleBullets: [
        "Juridico moderno",
        "Premium",
        "Sobrio",
        "Elegante",
        "Profissional",
        "Nao apelativo",
        "Nao comercial agressivo",
      ],
      palette: [
        "Azul marinho",
        "Branco",
        "Cinza claro",
        "Grafite",
        "Pequenos detalhes em dourado discreto",
      ],
      services: [
        "areas de atuacao",
        "atendimento consultivo",
        "orientacao juridica",
        "contato para avaliacao inicial",
      ],
      differentials: ["clareza", "responsabilidade", "organizacao", "atendimento humanizado"],
      extraRules: [
        "Nao usar frases como 'ganhe sua causa'",
        "Nao usar 'o melhor advogado'",
        "Nao inventar numero da OAB se nao for fornecido",
      ],
    };
  }

  return {
    marketLabel: area || "servicos profissionais",
    objective:
      "Transmitir confianca, profissionalismo, clareza nos servicos e facilitar o contato pelo WhatsApp.",
    styleBullets: [
      "Moderno",
      "Profissional",
      "Premium",
      "Claro",
      "Confiavel",
      "Nao apelativo",
      "Adequado ao nicho informado",
    ],
    palette: [
      "Branco",
      "Cinza claro",
      "Grafite",
      "Uma cor principal coerente com o nicho",
      "Detalhes discretos em cor de destaque",
    ],
    services: ["servicos principais do nicho", "beneficios claros", "formas de atendimento"],
    differentials: ["clareza", "agilidade", "organizacao", "atendimento profissional"],
    extraRules: ["Nao usar termos de advocacia, direito, tribunais ou OAB a menos que o nicho seja juridico"],
  };
}

export function generatePreviewPrompt(lead: Lead) {
  const name = lead.nome.trim() || "Negocio Profissional";
  const city = lead.cidade.trim() || "Curitiba e Regiao";
  const area = lead.area.trim() || "servicos profissionais";
  const profile = promptProfile(area);

  return `Crie uma imagem em formato de screenshot realista de um site desktop full page, como se fosse uma captura de tela completa de uma landing page profissional, moderna, sobria e premium.

A pagina deve ser para ${name}, profissional/empresa de ${profile.marketLabel} em ${city}, com atuacao aparente em ${area}.

Objetivo da pagina:
${profile.objective}

Estilo visual:

${profile.styleBullets.map((item) => `* ${item}`).join("\n")}

Paleta sugerida:

${profile.palette.map((item) => `* ${item}`).join("\n")}

Estrutura da landing page:

1. Navbar com nome da marca, servicos, sobre, avaliacoes e contato
2. Hero section grande com titulo forte e adequado ao nicho
3. Subtitulo explicando o atendimento de forma clara e profissional
4. Botao visual de WhatsApp
5. Secao de servicos principais: ${profile.services.join(", ")}
6. Secao sobre o profissional/empresa
7. Secao de diferenciais: ${profile.differentials.join(", ")}
8. Secao de duvidas frequentes
9. CTA final para contato
10. Footer institucional

Regras obrigatorias:

* A imagem deve parecer uma captura real de site, nao um flyer
* Layout desktop
* Pagina vertical longa
* Containers centralizados
* Boa hierarquia visual
* Muito respiro entre secoes
* Textos nitidos e legiveis
* Nao usar promessas de resultado
* Nao usar informacoes falsas
* Nao inventar certificacoes, registros profissionais, endereco ou telefone se nao forem fornecidos
* Nao usar fotos de pessoas reais identificaveis
${profile.extraRules.map((item) => `* ${item}`).join("\n")}
* Nao exagerar em efeitos
* Design limpo, confiavel e premium`;
}
