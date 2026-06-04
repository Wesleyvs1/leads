"use client";

import {
  Check,
  Clipboard,
  Download,
  Eye,
  FileUp,
  Filter,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { loadLeads, loadTemplates, saveLeads, saveTemplates, clearStorage } from "@/lib/storage";
import { LEAD_PRIORITIES, LEAD_STATUSES, Lead, LeadDraft, LeadPriority, LeadStatus, MessageTemplates, MessageVariant } from "@/types/lead";
import { parseLeadsCsv, leadsToCsv } from "@/utils/csv";
import { generateMessage, generatePreviewPrompt, generateTemplateMessage } from "@/utils/generators";
import { buildWaMeLink, emptyLeadDraft, isPhoneComplete, mainLink, siteNotFound, suggestPriority, toLead, touchLead } from "@/utils/lead";

type Toast = {
  text: string;
  tone?: "success" | "warning";
};

const messageVariants: Array<{ label: string; value: MessageVariant }> = [
  { label: "Primeiro contato", value: "primeiro-contato" },
  { label: "Curta", value: "curta" },
  { label: "Consultiva", value: "consultiva" },
  { label: "Direta", value: "direta" },
  { label: "Após autorização", value: "apos-autorizacao" },
];

const templateLabels: Record<keyof MessageTemplates, string> = {
  primeiroContato: "Primeiro contato",
  aposAutorizacao: "Após autorização",
  followUpLeve: "Follow-up leve",
};

export function ProspectorApp() {
  const [ready, setReady] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<MessageTemplates | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "Todos">("Todos");
  const [priorityFilter, setPriorityFilter] = useState<LeadPriority | "Todas">("Todas");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    setLeads(loadLeads());
    setTemplates(loadTemplates());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      saveLeads(leads);
    }
  }, [leads, ready]);

  useEffect(() => {
    if (ready && templates) {
      saveTemplates(templates);
    }
  }, [templates, ready]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const stats = useMemo(() => {
    return {
      total: leads.length,
      pendentes: leads.filter((lead) => lead.status === "Pendente").length,
      aprovados: leads.filter((lead) => lead.status === "Aprovado").length,
      enviados: leads.filter((lead) => lead.status === "Enviado manualmente").length,
      descartados: leads.filter((lead) => lead.status === "Descartado").length,
    };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesQuery =
        !normalizedQuery ||
        [lead.nome, lead.cidade, lead.area, lead.origem]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesStatus = statusFilter === "Todos" || lead.status === statusFilter;
      const matchesPriority = priorityFilter === "Todas" || lead.prioridade === priorityFilter;
      return matchesQuery && matchesStatus && matchesPriority;
    });
  }, [leads, priorityFilter, query, statusFilter]);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) || null,
    [leads, selectedLeadId],
  );

  function notify(text: string, tone: Toast["tone"] = "success") {
    setToast({ text, tone });
  }

  async function copyText(text: string, success = "Copiado") {
    if (!text.trim()) {
      notify("Nada para copiar", "warning");
      return;
    }

    await navigator.clipboard.writeText(text);
    notify(success);
  }

  function updateLead(id: string, updater: (lead: Lead) => Lead) {
    setLeads((current) =>
      current.map((lead) => (lead.id === id ? touchLead(updater(lead)) : lead)),
    );
  }

  function handleGenerateMessage(id: string, variant: MessageVariant = "primeiro-contato") {
    updateLead(id, (lead) => ({
      ...lead,
      mensagemGerada: generateMessage(lead, variant),
      status: lead.status === "Pendente" ? "Analisado" : lead.status,
    }));
    notify("Mensagem gerada");
  }

  function handleGeneratePrompt(id: string) {
    updateLead(id, (lead) => ({
      ...lead,
      promptGerado: generatePreviewPrompt(lead),
      status: "Preview gerado",
    }));
    notify("Prompt gerado");
  }

  function handleDiscard(id: string) {
    updateLead(id, (lead) => ({ ...lead, status: "Descartado" }));
    notify("Lead descartado");
  }

  function handleCreateLead(draft: LeadDraft) {
    const prepared = {
      ...draft,
      prioridade: draft.prioridade || suggestPriority(draft),
    };
    setLeads((current) => [toLead(prepared), ...current]);
    setShowCreate(false);
    notify("Lead adicionado");
  }

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imported = parseLeadsCsv(String(reader.result || ""));
      setLeads((current) => [...imported, ...current]);
      notify(`${imported.length} leads importados`);
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  function handleExport() {
    const blob = new Blob([leadsToCsv(leads)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `prospector-preview-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleClearAll() {
    const confirmed = window.confirm(
      "Tem certeza que deseja apagar todos os leads e templates salvos neste navegador?",
    );
    if (!confirmed) {
      return;
    }

    clearStorage();
    setLeads([]);
    setTemplates(loadTemplates());
    setSelectedLeadId(null);
    notify("Dados apagados");
  }

  if (!ready || !templates) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted">
        Carregando painel...
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-line bg-ink/85 p-5 backdrop-blur lg:border-b-0 lg:border-r">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg border border-copper/50 bg-copper/15 text-copper">
                <Sparkles size={20} />
              </span>
              <div>
                <h1 className="text-lg font-semibold text-paper">Prospector Preview</h1>
                <p className="text-sm text-muted">Painel manual local</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button className="button-primary w-full" onClick={() => setShowCreate(true)}>
              <Plus size={17} />
              Adicionar lead
            </button>

            <label className="button-secondary flex w-full cursor-pointer items-center justify-center gap-2">
              <FileUp size={17} />
              Importar CSV
              <input className="sr-only" type="file" accept=".csv,text/csv" onChange={handleImport} />
            </label>

            <button className="button-secondary w-full" onClick={handleExport}>
              <Download size={17} />
              Exportar CSV
            </button>

            <button className="button-danger w-full" onClick={handleClearAll}>
              <Trash2 size={17} />
              Limpar dados
            </button>
          </div>

          <div className="mt-8 rounded-lg border border-line bg-panel/70 p-4">
            <p className="mb-3 text-sm font-medium text-paper">Resumo</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <MiniStat label="Total" value={stats.total} />
              <MiniStat label="Pendentes" value={stats.pendentes} />
              <MiniStat label="Aprovados" value={stats.aprovados} />
              <MiniStat label="Enviados" value={stats.enviados} />
            </div>
          </div>
        </aside>

        <section className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-copper">Curitiba e Região</p>
              <h2 className="mt-2 text-2xl font-semibold text-paper sm:text-3xl">
                Leads para prospecção manual
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_160px]">
              <label className="control-wrap">
                <Search size={17} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar lead"
                  className="control-field"
                />
              </label>
              <label className="control-wrap">
                <Filter size={17} />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as LeadStatus | "Todos")}
                  className="control-field"
                >
                  <option>Todos</option>
                  {LEAD_STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="control-wrap">
                <Filter size={17} />
                <select
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value as LeadPriority | "Todas")}
                  className="control-field"
                >
                  <option>Todas</option>
                  {LEAD_PRIORITIES.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Total de leads" value={stats.total} />
            <StatCard label="Pendentes" value={stats.pendentes} />
            <StatCard label="Aprovados" value={stats.aprovados} />
            <StatCard label="Enviados manualmente" value={stats.enviados} />
            <StatCard label="Descartados" value={stats.descartados} tone="danger" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <div className="grid gap-4">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onOpen={() => setSelectedLeadId(lead.id)}
                    onGenerateMessage={() => handleGenerateMessage(lead.id)}
                    onGeneratePrompt={() => handleGeneratePrompt(lead.id)}
                    onCopyMessage={() =>
                      copyText(lead.mensagemGerada || generateMessage(lead), "Copiado")
                    }
                    onDiscard={() => handleDiscard(lead.id)}
                  />
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-line p-10 text-center text-muted">
                  Nenhum lead encontrado.
                </div>
              )}
            </div>

            <TemplatePanel templates={templates} onChange={setTemplates} />
          </div>
        </section>
      </div>

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          templates={templates}
          onClose={() => setSelectedLeadId(null)}
          onSave={(nextLead) => {
            updateLead(nextLead.id, () => nextLead);
            notify("Lead salvo");
          }}
          onCopy={copyText}
          onWarn={(text) => notify(text, "warning")}
        />
      )}

      {showCreate && (
        <LeadCreateModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateLead}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 rounded-lg border px-4 py-3 text-sm shadow-glow ${
            toast.tone === "warning"
              ? "border-copper/50 bg-copper/15 text-paper"
              : "border-good/40 bg-good/15 text-paper"
          }`}
        >
          {toast.text}
        </div>
      )}
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-ink/50 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-paper">{value}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "danger";
}) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${tone === "danger" ? "text-danger" : "text-paper"}`}>
        {value}
      </p>
    </div>
  );
}

function LeadCard({
  lead,
  onOpen,
  onGenerateMessage,
  onGeneratePrompt,
  onCopyMessage,
  onDiscard,
}: {
  lead: Lead;
  onOpen: () => void;
  onGenerateMessage: () => void;
  onGeneratePrompt: () => void;
  onCopyMessage: () => void;
  onDiscard: () => void;
}) {
  const link = mainLink(lead);

  return (
    <article className="rounded-lg border border-line bg-panel p-4 shadow-glow">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-lg font-semibold text-paper">
              {lead.nome || "Sem nome"}
            </h3>
            <StatusBadge status={lead.status} />
            <PriorityBadge priority={lead.prioridade} />
            {siteNotFound(lead.temSite) && (
              <span className="rounded-full border border-copper/40 bg-copper/10 px-2.5 py-1 text-xs text-copper">
                site não encontrado
              </span>
            )}
          </div>

          <div className="mt-3 grid gap-2 text-sm text-muted md:grid-cols-2 xl:grid-cols-4">
            <Info label="Cidade" value={lead.cidade || "Não informado"} />
            <Info label="Área" value={lead.area || "Não informado"} />
            <Info label="Origem" value={lead.origem || "Não informado"} />
            <Info label="Telefone" value={lead.telefone || "Não informado"} />
          </div>

          {link && (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex max-w-full text-sm text-copper underline-offset-4 hover:underline"
            >
              <span className="truncate">{link}</span>
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:w-[420px]">
          <ActionButton title="Abrir detalhes" onClick={onOpen} icon={<Eye size={16} />}>
            Detalhes
          </ActionButton>
          <ActionButton title="Gerar mensagem" onClick={onGenerateMessage} icon={<MessageSquareText size={16} />}>
            Mensagem
          </ActionButton>
          <ActionButton title="Gerar prompt do preview" onClick={onGeneratePrompt} icon={<Sparkles size={16} />}>
            Prompt
          </ActionButton>
          <ActionButton title="Copiar WhatsApp" onClick={onCopyMessage} icon={<Clipboard size={16} />}>
            Copiar
          </ActionButton>
          <ActionButton title="Descartar" onClick={onDiscard} icon={<Trash2 size={16} />} danger>
            Descartar
          </ActionButton>
        </div>
      </div>
    </article>
  );
}

function LeadDetailModal({
  lead,
  templates,
  onClose,
  onSave,
  onCopy,
  onWarn,
}: {
  lead: Lead;
  templates: MessageTemplates;
  onClose: () => void;
  onSave: (lead: Lead) => void;
  onCopy: (text: string, success?: string) => Promise<void>;
  onWarn: (text: string) => void;
}) {
  const [draft, setDraft] = useState<Lead>(lead);
  const [variant, setVariant] = useState<MessageVariant>("primeiro-contato");

  useEffect(() => {
    setDraft(lead);
  }, [lead]);

  function setField(field: keyof Lead, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function saveAndClose() {
    onSave(draft);
  }

  function setStatus(status: LeadStatus) {
    const next = { ...draft, status };
    setDraft(next);
    onSave(next);
  }

  function commit(next: Lead) {
    setDraft(next);
    onSave(next);
  }

  function generateDraftMessage(nextVariant: MessageVariant) {
    commit({
      ...draft,
      mensagemGerada: generateMessage(draft, nextVariant),
      status: draft.status === "Pendente" ? "Analisado" : draft.status,
    });
  }

  function generateDraftTemplate(key: keyof MessageTemplates) {
    commit({
      ...draft,
      mensagemGerada: generateTemplateMessage(draft, templates, key),
      status: draft.status === "Pendente" ? "Analisado" : draft.status,
    });
  }

  function generateDraftPrompt() {
    commit({
      ...draft,
      promptGerado: generatePreviewPrompt(draft),
      status: "Preview gerado",
    });
  }

  function copyWaMe() {
    const message = draft.mensagemGerada || generateMessage(draft);
    if (!isPhoneComplete(draft.telefone)) {
      onWarn("Telefone incompleto. Copie a mensagem manualmente.");
      return;
    }
    onCopy(buildWaMeLink(draft.telefone, message), "Link wa.me copiado");
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="mx-auto my-6 max-w-6xl rounded-lg border border-line bg-panel shadow-glow">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <h3 className="text-xl font-semibold text-paper">{draft.nome || "Lead sem nome"}</h3>
            <p className="mt-1 text-sm text-muted">
              {draft.cidade || "Cidade não informada"} · {draft.area || "Área não informada"}
            </p>
          </div>
          <button className="icon-button" onClick={onClose} title="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_420px]">
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <TextField label="Nome" value={draft.nome} onChange={(value) => setField("nome", value)} />
              <TextField label="Telefone" value={draft.telefone} onChange={(value) => setField("telefone", value)} />
              <TextField label="Cidade" value={draft.cidade} onChange={(value) => setField("cidade", value)} />
              <TextField label="Área" value={draft.area} onChange={(value) => setField("area", value)} />
              <TextField label="Origem" value={draft.origem} onChange={(value) => setField("origem", value)} />
              <TextField label="Tem site" value={draft.temSite} onChange={(value) => setField("temSite", value)} />
              <TextField label="Link" value={draft.link} onChange={(value) => setField("link", value)} />
              <TextField label="Instagram" value={draft.instagram} onChange={(value) => setField("instagram", value)} />
              <TextField label="Facebook" value={draft.facebook} onChange={(value) => setField("facebook", value)} />
              <TextField label="Maps" value={draft.maps} onChange={(value) => setField("maps", value)} />
            </div>

            <LinkList lead={draft} />

            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                label="Status"
                value={draft.status}
                onChange={(value) => setField("status", value)}
                options={LEAD_STATUSES}
              />
              <SelectField
                label="Prioridade"
                value={draft.prioridade}
                onChange={(value) => setField("prioridade", value)}
                options={LEAD_PRIORITIES}
              />
            </div>

            <TextAreaField
              label="Observações"
              value={draft.observacoes}
              onChange={(value) => setField("observacoes", value)}
              rows={4}
            />
            <TextAreaField
              label="Análise manual"
              value={draft.analiseManual}
              onChange={(value) => setField("analiseManual", value)}
              rows={4}
            />
            <TextAreaField
              label="Mensagem gerada"
              value={draft.mensagemGerada}
              onChange={(value) => setField("mensagemGerada", value)}
              rows={8}
            />
            <TextAreaField
              label="Prompt de imagem gerado"
              value={draft.promptGerado}
              onChange={(value) => setField("promptGerado", value)}
              rows={12}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-line bg-ink/40 p-4">
              <p className="mb-3 text-sm font-medium text-paper">Gerar mensagem</p>
              <select
                value={variant}
                onChange={(event) => setVariant(event.target.value as MessageVariant)}
                className="input-base mb-3"
              >
                {messageVariants.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <div className="grid gap-2">
                <button className="button-primary" onClick={() => generateDraftMessage(variant)}>
                  <MessageSquareText size={17} />
                  Gerar mensagem
                </button>
                {(Object.keys(templates) as Array<keyof MessageTemplates>).map((key) => (
                  <button
                    key={key}
                    className="button-secondary"
                    onClick={() => generateDraftTemplate(key)}
                  >
                    <Pencil size={16} />
                    {templateLabels[key]}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-line bg-ink/40 p-4">
              <p className="mb-3 text-sm font-medium text-paper">Ações</p>
              <div className="grid gap-2">
                <button className="button-primary" onClick={saveAndClose}>
                  <Check size={17} />
                  Salvar
                </button>
                <button className="button-secondary" onClick={generateDraftPrompt}>
                  <Sparkles size={17} />
                  Gerar prompt do preview
                </button>
                <button className="button-secondary" onClick={() => onCopy(draft.mensagemGerada)}>
                  <Clipboard size={17} />
                  Copiar mensagem
                </button>
                <button className="button-secondary" onClick={() => onCopy(draft.promptGerado)}>
                  <Clipboard size={17} />
                  Copiar prompt
                </button>
                <button className="button-secondary" onClick={copyWaMe}>
                  <Send size={17} />
                  Copiar link wa.me
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-ink/40 p-4">
              <p className="mb-3 text-sm font-medium text-paper">Status rápido</p>
              <div className="grid gap-2">
                <button className="button-secondary" onClick={() => setStatus("Aprovado")}>
                  Marcar como aprovado
                </button>
                <button className="button-secondary" onClick={() => setStatus("Enviado manualmente")}>
                  Marcar como enviado manualmente
                </button>
                <button className="button-secondary" onClick={() => setStatus("Respondeu")}>
                  Marcar como respondeu
                </button>
                <button className="button-danger" onClick={() => setStatus("Descartado")}>
                  Descartar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadCreateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (draft: LeadDraft) => void;
}) {
  const [draft, setDraft] = useState<LeadDraft>(emptyLeadDraft);

  function setField(field: keyof LeadDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: value,
      prioridade:
        field === "telefone" || field === "temSite" || field === "instagram" || field === "facebook"
          ? suggestPriority({ ...current, [field]: value })
          : current.prioridade,
    }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onCreate(draft);
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="mx-auto my-8 max-w-3xl rounded-lg border border-line bg-panel p-5 shadow-glow"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-paper">Adicionar lead</h3>
          <button type="button" className="icon-button" onClick={onClose} title="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <TextField label="Nome" value={draft.nome} onChange={(value) => setField("nome", value)} />
          <TextField label="Telefone" value={draft.telefone} onChange={(value) => setField("telefone", value)} />
          <TextField label="Cidade" value={draft.cidade} onChange={(value) => setField("cidade", value)} />
          <TextField label="Área" value={draft.area} onChange={(value) => setField("area", value)} />
          <TextField label="Origem" value={draft.origem} onChange={(value) => setField("origem", value)} />
          <TextField label="Tem site" value={draft.temSite} onChange={(value) => setField("temSite", value)} />
          <TextField label="Link" value={draft.link} onChange={(value) => setField("link", value)} />
          <TextField label="Instagram" value={draft.instagram} onChange={(value) => setField("instagram", value)} />
          <TextField label="Facebook" value={draft.facebook} onChange={(value) => setField("facebook", value)} />
          <TextField label="Maps" value={draft.maps} onChange={(value) => setField("maps", value)} />
          <SelectField
            label="Prioridade"
            value={draft.prioridade}
            onChange={(value) => setField("prioridade", value)}
            options={LEAD_PRIORITIES}
          />
        </div>

        <div className="mt-3">
          <TextAreaField
            label="Observações"
            value={draft.observacoes}
            onChange={(value) => setField("observacoes", value)}
            rows={4}
          />
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="button-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="button-primary">
            <Plus size={17} />
            Adicionar
          </button>
        </div>
      </form>
    </div>
  );
}

function TemplatePanel({
  templates,
  onChange,
}: {
  templates: MessageTemplates;
  onChange: (templates: MessageTemplates) => void;
}) {
  return (
    <aside className="h-fit rounded-lg border border-line bg-panel p-4">
      <div className="mb-4 flex items-center gap-2">
        <Pencil size={17} className="text-copper" />
        <h3 className="font-semibold text-paper">Templates editáveis</h3>
      </div>
      <div className="space-y-4">
        {(Object.keys(templates) as Array<keyof MessageTemplates>).map((key) => (
          <TextAreaField
            key={key}
            label={templateLabels[key]}
            value={templates[key]}
            rows={7}
            onChange={(value) => onChange({ ...templates, [key]: value })}
          />
        ))}
      </div>
    </aside>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted/75">{label}</p>
      <p className="truncate text-paper">{value}</p>
    </div>
  );
}

function LinkList({ lead }: { lead: Lead }) {
  const links = [
    ["Link", lead.link],
    ["Instagram", lead.instagram],
    ["Facebook", lead.facebook],
    ["Maps", lead.maps],
  ].filter(([, url]) => Boolean(url));

  if (!links.length) {
    return <p className="text-sm text-muted">Nenhum link informado.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {links.map(([label, url]) => (
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-copper/40 bg-copper/10 px-3 py-2 text-sm text-copper hover:bg-copper/15"
        >
          {label}
        </a>
      ))}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      <input className="input-base" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      <textarea
        className="input-base min-h-[90px] resize-y leading-relaxed"
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      <select className="input-base" value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const positive = ["Aprovado", "Enviado manualmente", "Respondeu"].includes(status);
  const negative = ["Descartado", "Sem interesse"].includes(status);
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs ${
        positive
          ? "border-good/35 bg-good/10 text-good"
          : negative
            ? "border-danger/35 bg-danger/10 text-danger"
            : "border-line bg-ink/60 text-muted"
      }`}
    >
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: LeadPriority }) {
  const className =
    priority === "Alta"
      ? "border-copper/40 bg-copper/10 text-copper"
      : priority === "Média"
        ? "border-good/30 bg-good/10 text-good"
        : "border-line bg-ink/60 text-muted";

  return <span className={`rounded-full border px-2.5 py-1 text-xs ${className}`}>{priority}</span>;
}

function ActionButton({
  children,
  icon,
  title,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
        danger
          ? "border-danger/35 bg-danger/10 text-danger hover:bg-danger/15"
          : "border-line bg-ink/60 text-paper hover:border-copper/50 hover:bg-copper/10"
      }`}
      title={title}
      onClick={onClick}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}
