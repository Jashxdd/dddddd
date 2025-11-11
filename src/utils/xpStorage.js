import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { modifyBalance } from './economyStorage.js';
import { getEffectiveLevelConfig } from './levelConfigStorage.js';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'levels.json');

let cache = {};
let loaded = false;
let writePromise = null;

function ensureGuild(guildId) {
  if (!cache[guildId]) {
    cache[guildId] = {};
  }
}

function ensureUser(guildId, userId) {
  ensureGuild(guildId);
  if (!cache[guildId][userId]) {
    cache[guildId][userId] = {
      level: 1,
      totalXp: 0,
      messageXp: 0,
      commandXp: 0,
      voiceXp: 0,
      lastUpdatedAt: new Date().toISOString(),
      rewards: []
    };
  }
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
    cache = parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('⚠️ Seviye verileri okunamadı, yeni dosya oluşturulacak.', error);
    cache = {};
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(cache, null, 2);

  writePromise = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Seviye verileri kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writePromise = null;
    });

  await writePromise;
}

function xpForLevel(level) {
  const base = level * level * 75 + level * 150 + 100;
  return Math.max(base, 200);
}

function findRewardsForLevel(levelConfig, level) {
  const rewards = Array.isArray(levelConfig?.rewards) ? levelConfig.rewards : [];
  return rewards.filter((reward) => Number.isFinite(reward?.level) && reward.level === level);
}

async function grantEconomyReward(userId, amount) {
  if (!userId) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  try {
    const balance = await modifyBalance(userId, amount);
    return balance;
  } catch (error) {
    console.error('Ekonomi ödülü aktarılırken hata oluştu:', error);
    return null;
  }
}

export async function addXp({ guildId, userId, type, amount }) {
  if (!guildId || !userId || !type) {
    throw new Error('XP eklemek için sunucu, kullanıcı ve tür belirtilmelidir.');
  }

  const numericAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  if (!numericAmount) {
    return { leveledUp: false, entry: null, rewards: [] };
  }

  const levelConfig = getEffectiveLevelConfig(guildId);
  if (!levelConfig.enabled) {
    return { leveledUp: false, entry: null, rewards: [] };
  }

  await ensureLoaded();
  ensureUser(guildId, userId);

  const entry = cache[guildId][userId];
  const nowIso = new Date().toISOString();
  entry.lastUpdatedAt = nowIso;

  if (type === 'message') {
    entry.messageXp += numericAmount;
  } else if (type === 'command') {
    entry.commandXp += numericAmount;
  } else if (type === 'voice') {
    entry.voiceXp += numericAmount;
  }

  entry.totalXp += numericAmount;

  let leveledUp = false;
  const grantedRewards = [];
  let required = xpForLevel(entry.level + 1);

  while (entry.totalXp >= required) {
    entry.level += 1;
    leveledUp = true;

    const rewards = findRewardsForLevel(levelConfig, entry.level);
    if (rewards.length) {
      for (const reward of rewards) {
        const formatted = {
          ...reward,
          grantedAt: nowIso
        };
        entry.rewards.push(formatted);
        grantedRewards.push(formatted);
        if (Number.isFinite(reward?.credits) && reward.credits > 0) {
          await grantEconomyReward(userId, reward.credits);
        }
      }
    }

    required = xpForLevel(entry.level + 1);
  }

  await persist();
  return { leveledUp, entry: { ...entry }, rewards: grantedRewards };
}

export async function getUserLevel(guildId, userId) {
  if (!guildId || !userId) return null;
  await ensureLoaded();
  ensureUser(guildId, userId);
  return { ...cache[guildId][userId] };
}

export async function getLeaderboard(guildId, limit = 10) {
  if (!guildId) return [];
  await ensureLoaded();
  ensureGuild(guildId);

  const pairs = Object.entries(cache[guildId]);
  return pairs
    .map(([userId, entry]) => ({ userId, ...entry }))
    .sort((a, b) => b.totalXp - a.totalXp || b.level - a.level || a.userId.localeCompare(b.userId))
    .slice(0, Math.max(1, limit));
}

export async function getXpSummary(guildId) {
  if (!guildId) {
    return { totalUsers: 0, totalXp: 0 };
  }

  await ensureLoaded();
  ensureGuild(guildId);

  let totalXp = 0;
  const userIds = Object.keys(cache[guildId]);
  for (const userId of userIds) {
    totalXp += Number(cache[guildId][userId]?.totalXp ?? 0);
  }

  return { totalUsers: userIds.length, totalXp };
}

export function getLevelConfig(guildId) {
  return getEffectiveLevelConfig(guildId);
}

export async function forcePersistLevels() {
  if (!loaded) {
    return;
  }

  if (writePromise) {
    await writePromise;
  }

  await persist();
}

export function getXpRequirementForLevel(level) {
  if (!Number.isFinite(level)) {
    return xpForLevel(1);
  }
  const safeLevel = Math.max(1, Math.floor(level));
  return xpForLevel(safeLevel);
}
