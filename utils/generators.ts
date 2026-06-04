import type { Lead, MessageTemplates, MessageVariant } from "@/types/lead";

function displayName(lead: Pick<Lead, "nome">) {
  return lead.nome.trim();
}

function displayArea(lead: Pick<Lead, "area">) {
  return lead.area.trim();
}

function greeting(lead: Lead) {
  const name = displayName(lead);
  return name ? `Olá, boa tarde, Dr(a). ${name}. Tudo bem?` : "Olá, boa tarde. Tudo bem?";
}

export function fillTemplate(template: string, lead: Lead) {
  return template
    .replaceAll("[NOME]", displayName(lead) || "Advocacia Profissional")
    .replaceAll("[AREA]", displayArea(lead) || "atuação jurídica profissional")
    .replaceAll("[CIDADE]", lead.cidade.trim() || "Curitiba e Região");
}

export function generateMessage(lead: Lead, variant: MessageVariant = "primeiro-contato") {
  const name = displayName(lead);
  const area = displayArea(lead);
  const areaLine = area
    ? `, objetiva e alinhada à sua atuação em ${area}`
    : ", objetiva e alinhada à sua presença profissional";

  if (variant === "curta") {
    return `${greeting(lead)}\n\nEncontrei seu perfil profissional e preparei uma ideia simples de prévia visual para um site mais profissional e claro${area ? ` na área de ${area}` : ""}.\n\nPosso te enviar para você avaliar sem compromisso?`;
  }

  if (variant === "consultiva") {
    return `${greeting(lead)}\n\nVi seu perfil profissional e percebi que uma página própria poderia ajudar a organizar melhor suas informações, áreas de atuação e formas de contato.\n\nPreparei uma prévia visual com uma abordagem sóbria e profissional${area ? ` para ${area}` : ""}. Posso te enviar para você avaliar sem compromisso?`;
  }

  if (variant === "direta") {
    return `${greeting(lead)}\n\nPreparei uma prévia visual de site profissional para seu perfil${area ? ` em ${area}` : ""}, com foco em apresentação clara e contato pelo WhatsApp.\n\nPosso te enviar para avaliação, sem compromisso?`;
  }

  if (variant === "apos-autorizacao") {
    return `Perfeito${name ? `, Dr(a). ${name}` : ""}.\n\nFiz uma prévia simples com base no seu posicionamento profissional${area ? ` e atuação em ${area}` : ""}. A ideia é transmitir mais confiança, organizar suas informações e facilitar o contato pelo WhatsApp.\n\nSegue a prévia.`;
  }

  return `${greeting(lead)}\n\nEncontrei seu perfil profissional e percebi uma oportunidade de melhorar sua presença digital com uma página mais profissional${areaLine}.\n\nPreparei uma ideia de prévia visual de como poderia ficar um site profissional para seu perfil, com foco em transmitir mais confiança, organizar suas informações e facilitar o contato pelo WhatsApp.\n\nPosso te enviar para você avaliar sem compromisso?`;
}

export function generateTemplateMessage(
  lead: Lead,
  templates: MessageTemplates,
  key: keyof MessageTemplates,
) {
  return fillTemplate(templates[key], lead);
}

export function generatePreviewPrompt(lead: Lead) {
  const name = lead.nome.trim() || "Advocacia Profissional";
  const city = lead.cidade.trim() || "Curitiba e Região";
  const area = lead.area.trim() || "atuação jurídica profissional";

  return `Crie uma imagem em formato de screenshot realista de um site desktop full page, como se fosse uma captura de tela completa de uma landing page profissional, moderna, sóbria e premium.

A página deve ser para ${name}, profissional da área jurídica em ${city}, com atuação aparente em ${area}.

Objetivo da página:
Transmitir confiança, autoridade profissional, clareza nas informações e facilitar o contato pelo WhatsApp.

Estilo visual:

* Jurídico moderno
* Premium
* Sóbrio
* Elegante
* Profissional
* Não apelativo
* Não comercial agressivo

Paleta sugerida:

* Azul marinho
* Branco
* Cinza claro
* Grafite
* Pequenos detalhes em dourado discreto

Estrutura da landing page:

1. Navbar com nome do profissional, áreas de atuação, sobre, contato
2. Hero section grande com título forte e sóbrio
3. Subtítulo explicando atendimento jurídico claro e profissional
4. Botão visual de WhatsApp
5. Seção de áreas de atuação
6. Seção sobre o profissional
7. Seção de diferenciais: atendimento humanizado, clareza, responsabilidade, organização
8. Seção de dúvidas frequentes
9. CTA final para contato
10. Footer institucional

Regras obrigatórias:

* A imagem deve parecer uma captura real de site, não um flyer
* Layout desktop
* Página vertical longa
* Containers centralizados
* Boa hierarquia visual
* Muito respiro entre seções
* Textos nítidos e legíveis
* Não usar promessas de resultado
* Não usar frases como 'ganhe sua causa'
* Não usar 'o melhor advogado'
* Não usar informações falsas
* Não inventar número da OAB se não for fornecido
* Não exagerar em efeitos
* Design limpo, confiável e premium`;
}
