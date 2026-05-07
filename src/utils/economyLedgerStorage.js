import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'economy-ledger.json');

const MAX_ENTRIES = 2000;
const MAX_USER_ENTRIES = 100;

let state = { entries: [] };
let loaded = false;
let writing = null;

function sanitiseString(value, maxLength = 180) {
  if (!value) return '';
  const text = String(value).trim();
  if (!text) return '';
  return text.slice(0, maxLength);
}

function sanitiseNumber(value) {
  if (!Number.isFinite(value)) return 0;
  return Number(value);
}

function sanitiseEntry(entry = {}) {
  const timestamp = Number.isFinite(entry.timestamp) ? Number(entry.timestamp) : Date.now();
  return {
    id: sanitiseString(entry.id) || `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    userId: sanitiseString(entry.userId),
    guildId: sanitiseString(entry.guildId),
    executorId: sanitiseString(entry.executorId),
    type: sanitiseString(entry.type) || 'genel',
    amount: sanitiseNumber(entry.amount),
    balanceAfter: Math.max(0, Math.floor(sanitiseNumber(entry.balanceAfter))),
    note: sanitiseString(entry.note, 240),
    timestamp
  };
}

async function ensureLoaded() {
  if (loaded) return;

  if (!existsSync(storagePath)) {
    state = { entries: [] };
    loaded = true;
    return;
  }

  try {
    const raw = await readFile(storagePath, 'utf8');
    const parsed = JSON.parse(raw.toString());
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.entries)) {
      state = {
        entries: parsed.entries
          .map((entry) => sanitiseEntry(entry))
          .sort((a, b) => b.timestamp - a.timestamp)
      };
    } else {
      state = { entries: [] };
    }
  } catch (error) {
    console.warn('⚠️ Ekonomi geçmişi okunamadı. Yeni kayıt dosyası oluşturulacak.', error);
    state = { entries: [] };
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(state, null, 2);
  writing = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Ekonomi geçmişi kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writing = null;
    });

  await writing;
}

export async function recordEconomyEvent(event) {
  if (!event?.userId) return null;

  await ensureLoaded();
  const entry = sanitiseEntry({ ...event, timestamp: event.timestamp ?? Date.now() });
  state.entries = [entry, ...state.entries];

  if (state.entries.length > MAX_ENTRIES) {
    state.entries = state.entries.slice(0, MAX_ENTRIES);
  }

  if (event.userId) {
    let count = 0;
    state.entries = state.entries.filter((item) => {
      if (item.userId !== event.userId) {
        return true;
      }
      count += 1;
      return count <= MAX_USER_ENTRIES;
    });
  }

  await persist();
  return entry;
}

export async function getUserEconomyHistory(userId, { limit = 5 } = {}) {
  if (!userId) return [];
  await ensureLoaded();
  const slice = Math.min(Math.max(1, Math.floor(limit)), 25);
  return state.entries.filter((entry) => entry.userId === userId).slice(0, slice);
}

export async function getGuildEconomyHistory(guildId, { limit = 10 } = {}) {
  if (!guildId) return [];
  await ensureLoaded();
  const slice = Math.min(Math.max(1, Math.floor(limit)), 50);
  return state.entries.filter((entry) => entry.guildId === guildId).slice(0, slice);
}

export async function waitForEconomyLedgerWrite() {
  if (writing) {
    await writing;
  }
}

export async function getEconomyLedgerStats({ guildId, userId } = {}) {
  await ensureLoaded();

  const normalisedGuildId = typeof guildId === 'string' ? guildId.trim() : '';
  const normalisedUserId = typeof userId === 'string' ? userId.trim() : '';

  const matchesFilter = (entry) => {
    if (normalisedGuildId && entry.guildId !== normalisedGuildId) {
      return false;
    }
    if (normalisedUserId && entry.userId !== normalisedUserId) {
      return false;
    }
    return true;
  };

  let guildCount = 0;
  let userCount = 0;
  let firstMatch = null;

  for (const entry of state.entries) {
    if (!firstMatch && matchesFilter(entry)) {
      firstMatch = entry;
    }

    if (normalisedGuildId && entry.guildId === normalisedGuildId) {
      guildCount += 1;
    }

    if (normalisedUserId && entry.userId === normalisedUserId) {
      userCount += 1;
    }
  }

  return {
    totalEntries: state.entries.length,
    guildEntries: normalisedGuildId ? guildCount : state.entries.length,
    userEntries: normalisedUserId ? userCount : state.entries.length,
    lastEntry: firstMatch ?? null
  };
}
