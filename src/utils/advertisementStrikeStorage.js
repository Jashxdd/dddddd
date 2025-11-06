import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'advertisement-strikes.json');

let cache = {};
let isLoaded = false;
let writeInProgress = null;

async function ensureLoaded() {
  if (isLoaded) {
    return;
  }

  if (!existsSync(storagePath)) {
    cache = {};
    isLoaded = true;
    return;
  }

  try {
    const raw = await readFile(storagePath, 'utf8');
    cache = JSON.parse(raw.toString()) ?? {};
  } catch (error) {
    console.warn('Reklam uyarı verileri okunurken hata oluştu. Sayaç sıfırlandı.', error);
    cache = {};
  }

  isLoaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });

  const data = JSON.stringify(cache, null, 2);
  writeInProgress = writeFile(storagePath, data, 'utf8')
    .catch((error) => {
      console.error('Reklam uyarı verileri kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writeInProgress = null;
    });

  await writeInProgress;
}

function ensureGuild(guildId) {
  if (!cache[guildId]) {
    cache[guildId] = {};
  }
}

export async function incrementAdvertisementStrike(guildId, userId) {
  if (!guildId || !userId) {
    return { count: 0 };
  }

  await ensureLoaded();
  ensureGuild(guildId);

  const guildMap = cache[guildId];
  const current = guildMap[userId] ?? 0;
  const next = current + 1;
  guildMap[userId] = next;

  await persist();

  return { count: next };
}

export async function resetAdvertisementStrikes(guildId, userId) {
  if (!guildId || !userId) {
    return false;
  }

  await ensureLoaded();
  ensureGuild(guildId);

  if (cache[guildId][userId]) {
    delete cache[guildId][userId];
    await persist();
    return true;
  }

  return false;
}

export async function getAdvertisementStrikeCount(guildId, userId) {
  if (!guildId || !userId) {
    return 0;
  }

  await ensureLoaded();
  ensureGuild(guildId);

  return cache[guildId][userId] ?? 0;
}

