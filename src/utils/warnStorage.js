import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'warnings.json');

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
    console.warn('Uyari verileri okunurken hata olustu. Varsayilan degerler kullanilacak.', error);
    cache = {};
  }

  isLoaded = true;
}

function ensureGuild(guildId) {
  if (!cache[guildId]) {
    cache[guildId] = {};
  }
}

function ensureUser(guildId, userId) {
  ensureGuild(guildId);
  if (!cache[guildId][userId]) {
    cache[guildId][userId] = [];
  }
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });

  const payload = JSON.stringify(cache, null, 2);
  writeInProgress = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Uyari verileri kaydedilirken hata olustu:', error);
    })
    .finally(() => {
      writeInProgress = null;
    });

  await writeInProgress;
}

export async function addWarning(guildId, userId, moderatorId, reason) {
  if (!guildId || !userId) {
    throw new Error('Gecerli bir sunucu ve kullanici belirtilmeli.');
  }

  await ensureLoaded();
  ensureUser(guildId, userId);

  const entry = {
    moderatorId,
    reason,
    createdAt: new Date().toISOString()
  };

  cache[guildId][userId].push(entry);
  await persist();

  return entry;
}

export async function listWarnings(guildId, userId) {
  if (!guildId || !userId) return [];

  await ensureLoaded();
  ensureUser(guildId, userId);

  return [...cache[guildId][userId]];
}

export async function removeWarning(guildId, userId, index) {
  if (!guildId || !userId) return false;

  await ensureLoaded();
  ensureUser(guildId, userId);

  const warnings = cache[guildId][userId];
  if (!warnings[index]) {
    return false;
  }

  warnings.splice(index, 1);
  await persist();
  return true;
}

export async function clearWarnings(guildId, userId) {
  if (!guildId || !userId) return false;

  await ensureLoaded();
  ensureUser(guildId, userId);

  if (!cache[guildId][userId].length) {
    return false;
  }

  cache[guildId][userId] = [];
  await persist();
  return true;
}

export async function getWarningStats(guildId) {
  if (!guildId) {
    return { totalUsers: 0, totalWarnings: 0 };
  }

  await ensureLoaded();
  ensureGuild(guildId);

  const guildEntries = cache[guildId];
  const userIds = Object.keys(guildEntries);
  let totalWarnings = 0;
  let affectedUsers = 0;

  for (const userId of userIds) {
    const warnings = guildEntries[userId];
    if (!Array.isArray(warnings) || !warnings.length) {
      continue;
    }

    totalWarnings += warnings.length;
    affectedUsers += 1;
  }

  return { totalUsers: affectedUsers, totalWarnings };
}
