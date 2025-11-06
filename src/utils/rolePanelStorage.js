import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import crypto from 'node:crypto';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'role-panels.json');

let cache = new Map();
let loaded = false;
let pendingWrite = null;

function generatePanelId() {
  return crypto.randomBytes(6).toString('hex');
}

async function ensureLoaded() {
  if (loaded) return;
  if (!existsSync(storagePath)) {
    cache = new Map();
    loaded = true;
    return;
  }

  try {
    const raw = await readFile(storagePath, 'utf8');
    const parsed = JSON.parse(raw.toString());
    cache = new Map(
      Object.entries(parsed ?? {}).map(([guildId, panels]) => [guildId, new Map(Object.entries(panels ?? {}))])
    );
  } catch (error) {
    console.warn('Rol paneli verileri okunurken hata oluştu. Varsayılan değerler kullanılacak.', error);
    cache = new Map();
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const serialised = {};
  for (const [guildId, panels] of cache.entries()) {
    serialised[guildId] = Object.fromEntries(panels.entries());
  }

  pendingWrite = writeFile(storagePath, JSON.stringify(serialised, null, 2), 'utf8')
    .catch((error) => {
      console.error('Rol paneli verileri kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      pendingWrite = null;
    });

  await pendingWrite;
}

export async function createRolePanel(guildId, panel) {
  await ensureLoaded();
  const panels = cache.get(guildId) ?? new Map();
  const panelId = generatePanelId();
  panels.set(panelId, { ...panel, panelId });
  cache.set(guildId, panels);
  await persist();
  return panels.get(panelId);
}

export async function getRolePanel(guildId, panelId) {
  await ensureLoaded();
  return cache.get(guildId)?.get(panelId) ?? null;
}

export async function updateRolePanel(guildId, panelId, updates) {
  await ensureLoaded();
  const panels = cache.get(guildId);
  if (!panels?.has(panelId)) return null;
  const current = panels.get(panelId);
  const next = { ...current, ...updates };
  panels.set(panelId, next);
  cache.set(guildId, panels);
  await persist();
  return next;
}

export async function deleteRolePanel(guildId, panelId) {
  await ensureLoaded();
  const panels = cache.get(guildId);
  if (!panels) return false;
  const removed = panels.delete(panelId);
  if (!panels.size) {
    cache.delete(guildId);
  }
  await persist();
  return removed;
}

export async function waitForRolePanelWrite() {
  if (pendingWrite) {
    await pendingWrite;
  }
}
