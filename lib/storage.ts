import { DEFAULT_TEMPLATES, SAMPLE_LEADS } from "@/lib/seed";
import type { Lead, MessageTemplates } from "@/types/lead";

const LEADS_KEY = "prospector-preview:leads";
const TEMPLATES_KEY = "prospector-preview:templates";

function getStorage(): Storage | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    const testKey = "prospector-preview:storage-test";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadLeads(): Lead[] {
  const storage = getStorage();

  if (!storage) {
    return SAMPLE_LEADS;
  }

  const raw = storage.getItem(LEADS_KEY);
  if (!raw) {
    storage.setItem(LEADS_KEY, JSON.stringify(SAMPLE_LEADS));
    return SAMPLE_LEADS;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SAMPLE_LEADS;
  } catch {
    return SAMPLE_LEADS;
  }
}

export function saveLeads(leads: Lead[]) {
  getStorage()?.setItem(LEADS_KEY, JSON.stringify(leads));
}

export function loadTemplates(): MessageTemplates {
  const storage = getStorage();

  if (!storage) {
    return DEFAULT_TEMPLATES;
  }

  const raw = storage.getItem(TEMPLATES_KEY);
  if (!raw) {
    storage.setItem(TEMPLATES_KEY, JSON.stringify(DEFAULT_TEMPLATES));
    return DEFAULT_TEMPLATES;
  }

  try {
    return { ...DEFAULT_TEMPLATES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export function saveTemplates(templates: MessageTemplates) {
  getStorage()?.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

export function clearStorage() {
  const storage = getStorage();
  storage?.removeItem(LEADS_KEY);
  storage?.removeItem(TEMPLATES_KEY);
}
