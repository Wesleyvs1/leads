# Prospector Preview

Painel local para prospecção manual de clientes. O app organiza leads, gera mensagens personalizadas prontas para copiar e cria prompts para previews visuais de sites, sem envio automático e sem APIs pagas.

## Como instalar

```bash
npm install
```

## Como rodar

```bash
npm run dev
```

Abra o endereço mostrado no terminal, normalmente `http://localhost:3000`.

## Importação CSV

Use o botão de importação no painel e selecione um arquivo `.csv`.

Campos aceitos:

```text
nome, telefone, cidade, area, origem, link, instagram, facebook, maps, observacoes, temSite, prioridade
```

Campos vazios ou ausentes são permitidos. A prioridade pode ser `Alta`, `Média` ou `Baixa`; se estiver vazia, o sistema sugere uma prioridade inicial.

## Limitações da versão sem API

- Os dados ficam apenas no navegador, via `localStorage`.
- Não há banco externo, backend de sincronização ou autenticação.
- A importação inicial aceita CSV, não XLSX.
- As mensagens e prompts são gerados por regras locais, sem OpenAI, Gemini ou APIs pagas.
- O preview visual deve ser gerado fora do sistema, em uma ferramenta de IA escolhida pelo usuário.

## Uso responsável

Este sistema não envia mensagens automaticamente e não deve ser usado para disparo em massa. Revise cada lead manualmente, respeite pedidos de remoção, não insista com quem não demonstrar interesse e mantenha uma abordagem profissional, curta e não agressiva.
