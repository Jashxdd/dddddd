import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'blacklist.json');

let cache = {
  global: {},
  economy: {}
};
let loaded = false;
let writing = null;

function normalizeEntry(entry = {}) {
  const reason = typeof entry.reason === 'string' ? entry.reason.trim() : '';
  const addedBy = typeof entry.addedBy === 'string' ? entry.addedBy : '';
  const addedAt = Number.isFinite(entry.addedAt) ? Number(entry.addedAt) : Date.now();

  return {
    reason: reason ? reason.slice(0, 240) : '',
    addedBy,
    addedAt
  };
}

async function ensureLoaded() {
  if (loaded) return;

  if (!existsSync(storagePath)) {
    loaded = true;
    return;
  }

  try {
    const raw = await readFile(storagePath, 'utf8');
    const parsed = JSON.parse(raw.toString());
    if (parsed && typeof parsed === 'object') {
      cache = {
        global: Object.fromEntries(
          Object.entries(parsed.global ?? {}).map(([userId, entry]) => [userId, normalizeEntry(entry)])
        ),
        economy: Object.fromEntries(
          Object.entries(parsed.economy ?? {}).map(([userId, entry]) => [userId, normalizeEntry(entry)])
        )
      };
    }
  } catch (error) {
    console.warn('⚠️ Kara liste verileri yüklenirken hata oluştu, boş liste ile devam ediliyor.', error);
    cache = { global: {}, economy: {} };
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(cache, null, 2);
  writing = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Kara liste verileri kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writing = null;
    });

  await writing;
}

function prepareEntry(reason, addedBy) {
  return normalizeEntry({
    reason,
    addedBy,
    addedAt: Date.now()
  });
}

function formatList(entriesMap) {
  return Object.entries(entriesMap)
    .map(([userId, entry]) => ({
      userId,
      ...normalizeEntry(entry)
    }))
    .sort((a, b) => b.addedAt - a.addedAt);
}

export async function listGlobalBlacklist() {
  await ensureLoaded();
  return formatList(cache.global);
}

export async function listEconomyBlacklist() {
  await ensureLoaded();
  return formatList(cache.economy);
}

export async function isGloballyBlacklisted(userId) {
  if (!userId) return false;
  await ensureLoaded();
  return Boolean(cache.global[userId]);
}

export async function isEconomyBlacklisted(userId) {
  if (!userId) return false;
  await ensureLoaded();
  return Boolean(cache.economy[userId]);
}

export async function addGlobalBlacklist(userId, reason = '', addedBy = '') {
  if (!userId) return false;
  await ensureLoaded();
  cache.global[userId] = prepareEntry(reason, addedBy);
  await persist();
  return true;
}

export async function removeGlobalBlacklist(userId) {
  if (!userId) return false;
  await ensureLoaded();
  if (!cache.global[userId]) return false;
  delete cache.global[userId];
  await persist();
  return true;
}

export async function addEconomyBlacklist(userId, reason = '', addedBy = '') {
  if (!userId) return false;
  await ensureLoaded();
  cache.economy[userId] = prepareEntry(reason, addedBy);
  await persist();
  return true;
}

export async function removeEconomyBlacklist(userId) {
  if (!userId) return false;
  await ensureLoaded();
  if (!cache.economy[userId]) return false;
  delete cache.economy[userId];
  await persist();
  return true;
}

export async function clearUserFromAllBlacklists(userId) {
  if (!userId) return false;
  await ensureLoaded();
  const existed = Boolean(cache.global[userId] || cache.economy[userId]);
  delete cache.global[userId];
  delete cache.economy[userId];
  if (existed) {
    await persist();
  }
  return existed;
}
