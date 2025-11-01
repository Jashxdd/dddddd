import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'rules-acceptance.json');

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
    console.warn('Kurallar kabul listesi okunurken hata olustu. Varsayilan degerler kullaniliyor.', error);
    cache = {};
  }

  isLoaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });

  const data = JSON.stringify(cache, null, 2);
  writeInProgress = writeFile(storagePath, data, 'utf8')
    .catch((error) => {
      console.error('Kurallar kabul listesini kaydederken hata olustu:', error);
    })
    .finally(() => {
      writeInProgress = null;
    });

  await writeInProgress;
}

function ensureGuild(guildId) {
  if (!cache[guildId]) {
    cache[guildId] = [];
  }
}

export async function hasAcceptedRules(guildId, userId) {
  if (!guildId || !userId) return false;

  await ensureLoaded();
  ensureGuild(guildId);

  return cache[guildId].includes(userId);
}

export async function acceptRules(guildId, userId) {
  if (!guildId || !userId) {
    return { alreadyAccepted: false };
  }

  await ensureLoaded();
  ensureGuild(guildId);

  const alreadyAccepted = cache[guildId].includes(userId);
  if (!alreadyAccepted) {
    cache[guildId].push(userId);
    await persist();
  } else if (writeInProgress) {
    await writeInProgress;
  }

  return { alreadyAccepted };
}

export async function revokeRulesAcceptance(guildId, userId) {
  if (!guildId || !userId) return false;

  await ensureLoaded();
  ensureGuild(guildId);

  const index = cache[guildId].indexOf(userId);
  if (index === -1) return false;

  cache[guildId].splice(index, 1);
  await persist();
  return true;
}

export async function getAcceptedUsers(guildId) {
  if (!guildId) return [];

  await ensureLoaded();
  ensureGuild(guildId);

  return [...cache[guildId]];
}

export async function clearAcceptedUsers(guildId) {
  if (!guildId) return false;

  await ensureLoaded();
  ensureGuild(guildId);

  if (!cache[guildId].length) {
    return false;
  }

  cache[guildId] = [];
  await persist();
  return true;
}
