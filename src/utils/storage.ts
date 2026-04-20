import fs   from 'fs';
import path from 'path';

import type { Pact }         from '../core/pact.types';
import type { Notification } from '../core/pact.types';

// ─── Storage Paths ────────────────────────────────────────────────────────────

const PACTS_PATH  = path.resolve(process.cwd(), 'src/storage/pacts.json');
const NOTIFS_PATH = path.resolve(process.cwd(), 'src/storage/notifications.json');

const ensureFile = (filePath: string, defaultContent = '[]'): void => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir))       fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath))  fs.writeFileSync(filePath, defaultContent, 'utf-8');
};

ensureFile(PACTS_PATH);
ensureFile(NOTIFS_PATH);

// ─── Generic helpers ──────────────────────────────────────────────────────────

const readJSON = <T>(filePath: string): T[] => {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const writeJSON = <T>(filePath: string, data: T[]): void => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

// ─── Pacts ────────────────────────────────────────────────────────────────────

export const getAllPacts     = (): Pact[]                   => readJSON<Pact>(PACTS_PATH);
export const getPactById     = (id: string): Pact | undefined => readJSON<Pact>(PACTS_PATH).find(p => p.id === id);
export const savePact        = (pact: Pact): void           => { const all = readJSON<Pact>(PACTS_PATH); all.push(pact); writeJSON(PACTS_PATH, all); };
export const updatePact      = (updated: Pact): void        => {
  const all   = readJSON<Pact>(PACTS_PATH);
  const index = all.findIndex(p => p.id === updated.id);
  if (index !== -1) { all[index] = updated; writeJSON(PACTS_PATH, all); }
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const getAllNotifications = (): Notification[]     => readJSON<Notification>(NOTIFS_PATH);
export const saveNotification    = (n: Notification): void => {
  const all = readJSON<Notification>(NOTIFS_PATH);
  all.push(n);
  writeJSON(NOTIFS_PATH, all);
};
export const markNotificationRead = (id: string): void => {
  const all = readJSON<Notification>(NOTIFS_PATH);
  const idx = all.findIndex(n => n.id === id);
  if (idx !== -1) { all[idx].read = true; writeJSON(NOTIFS_PATH, all); }
};
export const markAllNotificationsRead = (): void => {
  const all = readJSON<Notification>(NOTIFS_PATH).map(n => ({ ...n, read: true }));
  writeJSON(NOTIFS_PATH, all);
};
