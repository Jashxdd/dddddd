import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'autoreplies.json');

let cache = {};
let loaded = false;
let writing = null;

function normaliseEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : randomUUID();
  const trigger = typeof entry.trigger === 'string' ? entry.trigger.trim() : '';
  const response = typeof entry.response === 'string' ? entry.response.trim() : '';
  const matchType = entry.matchType === 'exact' ? 'exact' : 'contains';
  const createdAt = Number.isFinite(entry.createdAt) ? entry.createdAt : Date.now();
  const authorId = typeof entry.authorId === 'string' ? entry.authorId : null;

  if (!trigger || !response) {
    return null;
  }

  return {
    id,
    trigger,
    response,
    matchType,
    createdAt,
    authorId
  };
}

async function ensureLoaded() {
  if (loaded) return;

  if (!existsSync(storagePath)) {
    cache = {};
    loaded = true;
    return;
  }

  try {
    const raw = await readFile(storagePath, 'utf8');
    const parsed = JSON.parse(raw.toString());
    cache = {};
    if (parsed && typeof parsed === 'object') {
      for (const [guildId, entries] of Object.entries(parsed)) {
        if (!Array.isArray(entries)) continue;
        const normalised = entries
          .map((entry) => normaliseEntry(entry))
          .filter(Boolean);
        if (normalised.length) {
          cache[guildId] = normalised;
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Otomatik cevap verileri yüklenemedi. Varsayılan boş durum kullanılacak.', error);
    cache = {};
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(cache, null, 2);
  writing = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Otomatik cevap verileri kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writing = null;
    });

  await writing;
}

export async function getAutoReplies(guildId) {
  if (!guildId) return [];
  await ensureLoaded();
  return cache[guildId] ? [...cache[guildId]] : [];
}

export async function addAutoReply(guildId, { trigger, response, matchType = 'contains', authorId }) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  await ensureLoaded();
  const entry = normaliseEntry({ trigger, response, matchType, authorId, id: randomUUID(), createdAt: Date.now() });
  if (!entry) {
    throw new Error('Geçerli bir tetikleyici ve yanıt gereklidir.');
  }

  if (!cache[guildId]) {
    cache[guildId] = [];
  }

  cache[guildId].push(entry);
  await persist();
  return entry;
}

export async function removeAutoReply(guildId, idOrTrigger) {
  if (!guildId || !idOrTrigger) return false;
  await ensureLoaded();
  const entries = cache[guildId];
  if (!Array.isArray(entries)) return false;

  const identifier = String(idOrTrigger).trim().toLowerCase();
  const filtered = entries.filter((entry) => entry.id !== identifier && entry.trigger.toLowerCase() !== identifier);
  const removed = filtered.length !== entries.length;
  cache[guildId] = filtered;

  if (removed) {
    await persist();
  }

  return removed;
}

export async function clearAutoReplies(guildId) {
  if (!guildId) return;
  await ensureLoaded();
  if (cache[guildId]) {
    delete cache[guildId];
    await persist();
  }
}

export async function findAutoReplyMatch(guildId, content) {
  if (!guildId || !content) return null;
  await ensureLoaded();
  const entries = cache[guildId];
  if (!Array.isArray(entries) || !entries.length) return null;

  const normalised = content.trim().toLowerCase();
  for (const entry of entries) {
    if (!entry) continue;
    const trigger = entry.trigger.toLowerCase();
    if (entry.matchType === 'exact') {
      if (normalised === trigger) {
        return entry;
      }
    } else if (normalised.includes(trigger)) {
      return entry;
    }
  }

  return null;
}

export async function describeAutoReplies(guildId) {
  const entries = await getAutoReplies(guildId);
  if (!entries.length) {
    return { count: 0, lines: ['Bu sunucuda tanımlanmış otomatik cevap bulunmuyor.'] };
  }

  const lines = entries.map((entry, index) => {
    const type = entry.matchType === 'exact' ? 'tam eşleşme' : 'içerik';
    return `${index + 1}. \`${entry.trigger}\` → ${entry.response} *(\#${entry.id.slice(0, 6)} • ${type})*`;
  });

  return { count: entries.length, lines };
}

export async function getAutoReplyConfig() {
  await ensureLoaded();
  return { ...cache };
}
