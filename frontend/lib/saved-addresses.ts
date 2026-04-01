import { decodeJwtPayload } from "./jwt";
import { getAccessToken } from "./auth-tokens";

const STORAGE_KEY = "minutka_saved_addresses_v1";

export type SavedAddress = {
  id: string;
  ownerId: string;
  label: string;
  city: string;
  street: string;
  details?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  createdAt: string;
};

type SavedAddressInput = Omit<SavedAddress, "id" | "ownerId" | "createdAt">;

function getOwnerId(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return payload?.sub ?? payload?.email ?? null;
}

function readAll(): SavedAddress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedAddress[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: SavedAddress[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getSavedAddressesForCurrentUser(): SavedAddress[] {
  const ownerId = getOwnerId();
  if (!ownerId) return [];
  return readAll()
    .filter((x) => x.ownerId === ownerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addSavedAddressForCurrentUser(input: SavedAddressInput): SavedAddress | null {
  const ownerId = getOwnerId();
  if (!ownerId) return null;
  const record: SavedAddress = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ownerId,
    createdAt: new Date().toISOString(),
  };
  const next = [...readAll(), record];
  writeAll(next);
  return record;
}

export function removeSavedAddressForCurrentUser(id: string): void {
  const ownerId = getOwnerId();
  if (!ownerId) return;
  const next = readAll().filter((x) => !(x.ownerId === ownerId && x.id === id));
  writeAll(next);
}
