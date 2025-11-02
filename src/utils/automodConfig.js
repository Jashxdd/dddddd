import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'automod-settings.json');

let cache = {};
let isLoaded = false;
let writeInProgress = null;

async function ensureLoaded() {
  if (isLoaded) return;

  if (!existsSync(storagePath)) {
    cache = {};
    isLoaded = true;
    return;
  }

  try {
    const raw = await readFile(storagePath, 'utf8');
    cache = JSON.parse(raw.toString()) ?? {};
  } catch (error) {
    console.warn('Automod ayarlari okunurken hata olustu. Varsayilan degerler kullaniliyor.', error);
    cache = {};
  }

  isLoaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });

  const data = JSON.stringify(cache, null, 2);
  writeInProgress = writeFile(storagePath, data, 'utf8')
    .catch((error) => {
      console.error('Automod ayarlari kaydedilirken hata olustu:', error);
    })
    .finally(() => {
      writeInProgress = null;
    });

  await writeInProgress;
}

function ensureGuild(guildId) {
  if (!cache[guildId]) {
    cache[guildId] = { enabled: false, bannedWords: [], blockInvites: true };
    return;
  }

  if (!Array.isArray(cache[guildId].bannedWords)) {
    cache[guildId].bannedWords = [];
  }

  if (typeof cache[guildId].blockInvites !== 'boolean') {
    cache[guildId].blockInvites = true;
  }
}

export async function isAutomodEnabled(guildId) {
  if (!guildId) return false;

  await ensureLoaded();
  ensureGuild(guildId);

  return Boolean(cache[guildId].enabled);
}

export async function setAutomodEnabled(guildId, enabled) {
  if (!guildId) return false;

  await ensureLoaded();
  ensureGuild(guildId);

  cache[guildId].enabled = Boolean(enabled);
  await persist();
  return cache[guildId].enabled;
}

export async function getBannedWords(guildId) {
  if (!guildId) return [];

  await ensureLoaded();
  ensureGuild(guildId);

  return [...cache[guildId].bannedWords];
}

export async function isInviteBlockEnabled(guildId) {
  if (!guildId) return false;

  await ensureLoaded();
  ensureGuild(guildId);

  return Boolean(cache[guildId].blockInvites);
}

export async function setInviteBlockEnabled(guildId, enabled) {
  if (!guildId) return false;

  await ensureLoaded();
  ensureGuild(guildId);

  cache[guildId].blockInvites = Boolean(enabled);
  await persist();
  return cache[guildId].blockInvites;
}

export async function addBannedWord(guildId, word) {
  if (!guildId || !word) return { added: false };

  await ensureLoaded();
  ensureGuild(guildId);

  const normalized = word.toLowerCase();
  if (normalized.length < 2) {
    return { added: false, reason: 'kelime_cok_kisa' };
  }

  const bannedWords = cache[guildId].bannedWords;
  if (!bannedWords.includes(normalized)) {
    bannedWords.push(normalized);
    await persist();
    return { added: true };
  }

  if (writeInProgress) {
    await writeInProgress;
  }

  return { added: false, reason: 'zaten_var' };
}

export async function removeBannedWord(guildId, word) {
  if (!guildId || !word) return false;

  await ensureLoaded();
  ensureGuild(guildId);

  const normalized = word.toLowerCase();
  const bannedWords = cache[guildId].bannedWords;
  const index = bannedWords.indexOf(normalized);

  if (index === -1) return false;

  bannedWords.splice(index, 1);
  await persist();
  return true;
}

export async function findBannedWordInContent(guildId, content) {
  if (!guildId || !content) return null;

  await ensureLoaded();
  ensureGuild(guildId);

  const text = content.toLowerCase();
  return cache[guildId].bannedWords.find((word) => text.includes(word)) ?? null;
}
