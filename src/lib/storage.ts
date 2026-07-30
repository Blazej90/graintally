import type { SavedTransport } from '@/types/transport';

const STORAGE_KEY = 'klosek-transports';

export function getTransports(): SavedTransport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedTransport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTransport(transport: SavedTransport): void {
  const transports = getTransports();
  transports.unshift(transport);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transports));
}

export function deleteTransport(id: string): void {
  const transports = getTransports().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transports));
}

export function replaceTransport(id: string, transport: SavedTransport): void {
  const transports = getTransports().map((t) => (t.id === id ? transport : t));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transports));
}

export function getTransportById(id: string): SavedTransport | undefined {
  return getTransports().find((t) => t.id === id);
}

export function getTransportSummary() {
  const transports = getTransports();
  const count = transports.length;
  const totalValue = transports.reduce((sum, t) => sum + (t.totalValue || 0), 0);
  return { count, totalValue };
}
