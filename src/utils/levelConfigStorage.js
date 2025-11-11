import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../config.js';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'level-config.json');

const defaultSettings = Object.freeze({
  enabled: true,
  messageXp: 15,
  commandXp: 25,
  voiceXpPerMinute: 20,
  messageCooldown: 45
});

let cache = {
  global: { settings: {}, rewards: [], removedRewards: [], meta: {} },
  guilds: {}
};
let loaded = false;
let writePromise = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function buildDefaultConfig() {
  const source = config.leveling ?? {};
  const enabled = typeof source.enabled === 'boolean' ? source.enabled : defaultSettings.enabled;
  const toPositiveInt = (value, fallback, min = 1) => {
    if (!Number.isFinite(value)) return fallback;
    const normalised = Math.floor(value);
    return normalised >= min ? normalised : fallback;
  };

  const defaults = {
    enabled,
    messageXp: toPositiveInt(source.messageXp, defaultSettings.messageXp, 1),
    commandXp: toPositiveInt(source.commandXp, defaultSettings.commandXp, 1),
    voiceXpPerMinute: toPositiveInt(source.voiceXpPerMinute, defaultSettings.voiceXpPerMinute, 1),
    messageCooldown: toPositiveInt(source.messageCooldown, defaultSettings.messageCooldown, 10),
    rewards: []
  };

  return defaults;
}

function ensureContainerShape(container = {}) {
  return {
    settings: normaliseSettings(container.settings ?? {}),
    rewards: Array.isArray(container.rewards) ? container.rewards.map(normaliseStoredReward).filter(Boolean) : [],
    removedRewards: Array.isArray(container.removedRewards)
      ? Array.from(new Set(container.removedRewards.map((key) => String(key).trim()).filter(Boolean)))
      : [],
    meta: container.meta && typeof container.meta === 'object' ? { ...container.meta } : {}
  };
}

function ensureLoaded() {
  if (loaded) return;

  if (!existsSync(storagePath)) {
    cache = { global: { settings: {}, rewards: [], removedRewards: [], meta: {} }, guilds: {} };
    loaded = true;
    return;
  }

  try {
    const raw = readFileSync(storagePath, 'utf8');
    const parsed = JSON.parse(raw.toString());
    cache = {
      global: ensureContainerShape(parsed?.global ?? {}),
      guilds: {}
    };

    if (parsed?.guilds && typeof parsed.guilds === 'object') {
      for (const [guildId, value] of Object.entries(parsed.guilds)) {
        if (!guildId) continue;
        cache.guilds[guildId] = ensureContainerShape(value);
      }
    }
  } catch (error) {
    console.warn('⚠️ Seviye yapılandırması okunamadı. Varsayılan değerler kullanılacak.', error);
    cache = { global: { settings: {}, rewards: [], removedRewards: [], meta: {} }, guilds: {} };
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(cache, null, 2);
  writePromise = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Seviye yapılandırması kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writePromise = null;
    });

  await writePromise;
}

function normaliseSettings(raw) {
  const target = {};
  if (typeof raw.enabled === 'boolean') {
    target.enabled = raw.enabled;
  }
  if (Number.isFinite(raw.messageXp)) {
    const value = Math.floor(raw.messageXp);
    if (value >= 1) target.messageXp = value;
  }
  if (Number.isFinite(raw.commandXp)) {
    const value = Math.floor(raw.commandXp);
    if (value >= 1) target.commandXp = value;
  }
  if (Number.isFinite(raw.voiceXpPerMinute)) {
    const value = Math.floor(raw.voiceXpPerMinute);
    if (value >= 1) target.voiceXpPerMinute = value;
  }
  if (Number.isFinite(raw.messageCooldown)) {
    const value = Math.floor(raw.messageCooldown);
    if (value >= 10) target.messageCooldown = value;
  }
  return target;
}

function normaliseReward(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const level = Number.isFinite(raw.level) ? Math.max(1, Math.floor(raw.level)) : null;
  if (!level) return null;

  const roleId = typeof raw.roleId === 'string' && raw.roleId.trim().length ? raw.roleId.trim() : undefined;
  const credits = Number.isFinite(raw.credits) ? Math.max(0, Math.floor(raw.credits)) : undefined;
  const note = typeof raw.note === 'string' && raw.note.trim().length ? raw.note.trim().slice(0, 120) : undefined;

  if (!roleId && (!credits || credits <= 0)) {
    return null;
  }

  const reward = { level };
  if (roleId) reward.roleId = roleId;
  if (credits && credits > 0) reward.credits = credits;
  if (note) reward.note = note;
  if (raw.permission && typeof raw.permission === 'string') {
    reward.permission = raw.permission.trim().slice(0, 50);
  }
  return reward;
}

function normaliseStoredReward(raw) {
  const reward = normaliseReward(raw);
  if (!reward) return null;

  if (raw.addedAt) {
    reward.addedAt = raw.addedAt;
  }
  if (raw.addedBy) {
    reward.addedBy = raw.addedBy;
  }
  if (raw.addedByTag) {
    reward.addedByTag = raw.addedByTag;
  }
  return reward;
}

function rewardKey(reward) {
  const level = Number.isFinite(reward?.level) ? Math.floor(reward.level) : 0;
  if (!level) return '';
  const rolePart = reward.roleId ? reward.roleId : 'none';
  const creditPart = Number.isFinite(reward.credits) ? Math.max(0, Math.floor(reward.credits)) : 'none';
  return `${level}:${rolePart}:${creditPart}`;
}

function resolveScope(scope, guildId) {
  ensureLoaded();
  if (scope === 'global') {
    cache.global = cache.global ? ensureContainerShape(cache.global) : { settings: {}, rewards: [], removedRewards: [], meta: {} };
    return cache.global;
  }

  if (!guildId) {
    throw new Error('Sunucu kimliği gerekli.');
  }

  if (!cache.guilds[guildId]) {
    cache.guilds[guildId] = { settings: {}, rewards: [], removedRewards: [], meta: {} };
  } else {
    cache.guilds[guildId] = ensureContainerShape(cache.guilds[guildId]);
  }
  return cache.guilds[guildId];
}

function mergeRewards(defaultRewards, globalContainer, guildContainer) {
  const map = new Map();
  const applyList = (list = []) => {
    for (const reward of list) {
      const normalised = normaliseStoredReward(reward);
      if (!normalised) continue;
      const key = rewardKey(normalised);
      if (!key) continue;
      map.set(key, { ...normalised });
    }
  };

  applyList(defaultRewards);

  const applyContainer = (container) => {
    if (!container) return;
    const removals = new Set(container.removedRewards ?? []);
    for (const key of removals) {
      map.delete(key);
    }
    applyList(container.rewards);
  };

  applyContainer(globalContainer);
  applyContainer(guildContainer);

  return Array.from(map.values()).sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    if ((a.roleId ?? '') !== (b.roleId ?? '')) {
      return (a.roleId ?? '').localeCompare(b.roleId ?? '', 'tr');
    }
    return (a.credits ?? 0) - (b.credits ?? 0);
  });
}

function buildOverview(guildId) {
  ensureLoaded();
  const defaults = buildDefaultConfig();
  const globalContainer = ensureContainerShape(cache.global ?? {});
  const guildContainer = guildId ? ensureContainerShape(cache.guilds[guildId] ?? {}) : ensureContainerShape();
  const effective = {
    ...defaults,
    ...globalContainer.settings,
    ...guildContainer.settings
  };
  effective.rewards = mergeRewards(defaults.rewards, globalContainer, guildContainer);
  return {
    defaults,
    global: globalContainer,
    guild: guildContainer,
    effective
  };
}

export function getEffectiveLevelConfig(guildId) {
  return buildOverview(guildId).effective;
}

export function getLevelOverview(guildId) {
  const { defaults, global, guild, effective } = buildOverview(guildId);
  return {
    defaults: clone(defaults),
    global: clone(global),
    guild: clone(guild),
    effective: clone(effective)
  };
}

function stampMeta(container, actor) {
  container.meta = {
    updatedAt: new Date().toISOString(),
    updatedBy: actor?.id ?? null,
    updatedByTag: actor?.tag ?? null
  };
}

export async function updateLevelSettings({ scope = 'guild', guildId, settings = {}, actor }) {
  const container = resolveScope(scope, guildId);
  const normalised = normaliseSettings(settings);
  if (!Object.keys(normalised).length) {
    return { updated: false, settings: clone(container.settings) };
  }

  container.settings = { ...container.settings, ...normalised };
  stampMeta(container, actor);
  await persist();
  return { updated: true, settings: clone(container.settings) };
}

export async function resetLevelOverrides({ scope = 'guild', guildId, actor }) {
  if (scope === 'global') {
    cache.global = { settings: {}, rewards: [], removedRewards: [], meta: {} };
  } else {
    if (!guildId) throw new Error('Sunucu kimliği gerekli.');
    delete cache.guilds[guildId];
  }
  ensureLoaded();
  stampMeta(resolveScope(scope, guildId), actor);
  await persist();
  return { reset: true };
}

export async function addLevelReward({ scope = 'guild', guildId, reward, actor }) {
  const container = resolveScope(scope, guildId);
  const normalised = normaliseReward(reward);
  if (!normalised) {
    throw new Error('Geçerli bir ödül tanımı gerekli.');
  }

  const key = rewardKey(normalised);
  if (!key) {
    throw new Error('Ödül anahtarı oluşturulamadı.');
  }

  container.rewards = container.rewards.filter((entry) => rewardKey(entry) !== key);
  container.rewards.push({
    ...normalised,
    addedAt: new Date().toISOString(),
    addedBy: actor?.id ?? null,
    addedByTag: actor?.tag ?? null
  });
  container.removedRewards = (container.removedRewards ?? []).filter((entry) => entry !== key);
  stampMeta(container, actor);
  await persist();
  return { added: true, reward: normalised };
}

function collectCandidateRewards(scope, guildId) {
  const defaults = buildDefaultConfig().rewards ?? [];
  const globalRewards = cache.global?.rewards ?? [];
  const collected = [...defaults, ...globalRewards];
  if (scope !== 'global' && guildId && cache.guilds[guildId]?.rewards) {
    collected.push(...cache.guilds[guildId].rewards);
  }
  return collected.map((reward) => normaliseStoredReward(reward)).filter(Boolean);
}

export async function removeLevelReward({
  scope = 'guild',
  guildId,
  level,
  roleId,
  credits,
  removeAll = false,
  actor
}) {
  const container = resolveScope(scope, guildId);
  const targetLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : null;
  if (!targetLevel) {
    throw new Error('Geçerli bir seviye değeri gerekli.');
  }

  const normalisedRoleId = typeof roleId === 'string' && roleId.trim().length ? roleId.trim() : undefined;
  const normalisedCredits = Number.isFinite(credits) ? Math.max(0, Math.floor(credits)) : undefined;

  const candidates = collectCandidateRewards(scope, guildId);
  const keysToRemove = new Set();

  for (const reward of candidates) {
    if (!reward || reward.level !== targetLevel) continue;
    if (normalisedRoleId && reward.roleId !== normalisedRoleId) continue;
    if (!removeAll && normalisedRoleId && !reward.roleId) continue;
    if (typeof normalisedCredits === 'number' && reward.credits !== normalisedCredits) continue;
    if (!removeAll && !normalisedRoleId && typeof normalisedCredits !== 'number' && reward.roleId && reward.credits) {
      // Eğer hem rol hem kredi varsa ve spesifik alan verilmediyse tamamını silmek için removeAll beklenir
      continue;
    }
    keysToRemove.add(rewardKey(reward));
  }

  if (!keysToRemove.size) {
    return { removed: 0 };
  }

  container.rewards = container.rewards.filter((reward) => !keysToRemove.has(rewardKey(reward)));
  const mergedRemovals = new Set([...(container.removedRewards ?? []), ...keysToRemove]);
  container.removedRewards = Array.from(mergedRemovals);
  stampMeta(container, actor);
  await persist();
  return { removed: keysToRemove.size };
}

export async function waitForLevelConfigWrites() {
  if (writePromise) {
    await writePromise;
  }
}
