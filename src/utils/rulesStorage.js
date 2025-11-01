import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'rules-acceptance.json');

const DEFAULT_CACHE = () => ({ globalAccepted: [], guilds: {} });

let cache = DEFAULT_CACHE();
let isLoaded = false;
let writeInProgress = null;

async function ensureLoaded() {
  if (isLoaded) return;

  if (!existsSync(storagePath)) {
    cache = DEFAULT_CACHE();
    isLoaded = true;
    return;
  }

  try {
    const raw = await readFile(storagePath, 'utf8');
    cache = normalizeCache(JSON.parse(raw.toString()));
  } catch (error) {
    console.warn('Kurallar kabul listesi okunurken hata olustu. Varsayilan degerler kullaniliyor.', error);
    cache = DEFAULT_CACHE();
  }

  isLoaded = true;
}

function normalizeCache(value) {
  if (!value || typeof value !== 'object') {
    return DEFAULT_CACHE();
  }

  if (!Object.prototype.hasOwnProperty.call(value, 'globalAccepted') && !Object.prototype.hasOwnProperty.call(value, 'guilds')) {
    const guildEntries = value;
    const guilds = {};
    const globalSet = new Set();

    for (const [guildId, users] of Object.entries(guildEntries)) {
      if (!Array.isArray(users)) continue;
      const unique = [...new Set(users.filter((id) => typeof id === 'string'))];
      if (!unique.length) continue;

      for (const userId of unique) {
        globalSet.add(userId);
      }
      guilds[guildId] = { accepted: unique, revoked: [] };
    }

    return {
      globalAccepted: [...globalSet],
      guilds
    };
  }

  const normalized = {
    globalAccepted: Array.isArray(value.globalAccepted)
      ? [...new Set(value.globalAccepted.filter((id) => typeof id === 'string'))]
      : [],
    guilds: {}
  };

  if (value.guilds && typeof value.guilds === 'object') {
    for (const [guildId, entry] of Object.entries(value.guilds)) {
      if (!guildId) continue;
      if (Array.isArray(entry)) {
        const unique = [...new Set(entry.filter((id) => typeof id === 'string'))];
        normalized.guilds[guildId] = { accepted: unique, revoked: [] };
        continue;
      }

      if (!entry || typeof entry !== 'object') continue;

      const accepted = Array.isArray(entry.accepted)
        ? [...new Set(entry.accepted.filter((id) => typeof id === 'string'))]
        : [];
      const revoked = Array.isArray(entry.revoked)
        ? [...new Set(entry.revoked.filter((id) => typeof id === 'string'))]
        : [];

      normalized.guilds[guildId] = { accepted, revoked };
    }
  }

  return normalized;
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
  if (!guildId) return;

  if (!cache.guilds[guildId]) {
    cache.guilds[guildId] = { accepted: [], revoked: [] };
  }
}

export async function hasAcceptedRules(guildId, userId) {
  if (!guildId || !userId) return false;

  await ensureLoaded();
  ensureGuild(guildId);

  const guildData = cache.guilds[guildId];
  if (guildData.revoked.includes(userId)) {
    return false;
  }

  if (cache.globalAccepted.includes(userId)) {
    if (!guildData.accepted.includes(userId)) {
      guildData.accepted.push(userId);
      await persist();
    }
    return true;
  }

  return guildData.accepted.includes(userId);
}

export async function acceptRules(guildId, userId) {
  if (!guildId || !userId) {
    return { alreadyAccepted: false };
  }

  await ensureLoaded();
  ensureGuild(guildId);

  const guildData = cache.guilds[guildId];
  const wasRevokedIndex = guildData.revoked.indexOf(userId);
  if (wasRevokedIndex !== -1) {
    guildData.revoked.splice(wasRevokedIndex, 1);
  }

  const alreadyGlobal = cache.globalAccepted.includes(userId);
  const alreadyGuild = guildData.accepted.includes(userId);
  const alreadyAccepted = alreadyGlobal && alreadyGuild && wasRevokedIndex === -1;

  if (!alreadyGuild) {
    guildData.accepted.push(userId);
  }

  if (!alreadyGlobal) {
    cache.globalAccepted.push(userId);
  }

  if (!alreadyGuild || !alreadyGlobal || wasRevokedIndex !== -1) {
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

  const guildData = cache.guilds[guildId];
  const index = guildData.accepted.indexOf(userId);
  const revokedIndex = guildData.revoked.indexOf(userId);
  const wasGloballyAccepted = cache.globalAccepted.includes(userId);

  let changed = false;

  if (index !== -1) {
    guildData.accepted.splice(index, 1);
    changed = true;
  }

  if (revokedIndex === -1) {
    guildData.revoked.push(userId);
    changed = true;
  }

  if (!changed) {
    return false;
  }

  await persist();
  return index !== -1 || wasGloballyAccepted;
}

export async function getAcceptedUsers(guildId) {
  if (!guildId) return [];

  await ensureLoaded();
  ensureGuild(guildId);

  const guildData = cache.guilds[guildId];
  const combined = new Set(guildData.accepted);

  for (const userId of cache.globalAccepted) {
    if (guildData.revoked.includes(userId)) continue;
    combined.add(userId);
  }

  return [...combined];
}

export async function clearAcceptedUsers(guildId) {
  if (!guildId) return false;

  await ensureLoaded();
  ensureGuild(guildId);

  const guildData = cache.guilds[guildId];
  if (!guildData.accepted.length) {
    return false;
  }

  const previous = guildData.accepted.slice();
  guildData.accepted = [];
  for (const userId of previous) {
    if (!guildData.revoked.includes(userId)) {
      guildData.revoked.push(userId);
    }
  }

  await persist();
  return true;
}
