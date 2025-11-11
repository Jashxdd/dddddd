import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'inviteSettings.json');

const defaultGuildEntry = () => ({
  logChannelId: '',
  rewards: [],
  stats: {},
  attributions: {}
});

let cache = {};
let loaded = false;
let writing = null;

function sanitiseReward(reward) {
  if (!reward || typeof reward !== 'object') return null;
  const amount = Number.parseInt(reward.amount, 10);
  const roleId = typeof reward.roleId === 'string' ? reward.roleId.trim() : '';
  if (!roleId || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return { amount, roleId };
}

function normaliseGuildEntry(entry) {
  const base = defaultGuildEntry();
  if (!entry || typeof entry !== 'object') {
    return base;
  }

  base.logChannelId = typeof entry.logChannelId === 'string' ? entry.logChannelId.trim() : '';

  const rewards = Array.isArray(entry.rewards) ? entry.rewards.map(sanitiseReward).filter(Boolean) : [];
  const uniqueRewards = new Map();
  for (const reward of rewards) {
    const existing = uniqueRewards.get(reward.roleId);
    if (!existing || existing.amount > reward.amount) {
      uniqueRewards.set(reward.roleId, reward);
    }
  }
  base.rewards = Array.from(uniqueRewards.values()).sort((a, b) => a.amount - b.amount);

  if (entry.stats && typeof entry.stats === 'object') {
    base.stats = {};
    for (const [userId, rawStats] of Object.entries(entry.stats)) {
      if (!userId) continue;
      const joins = Number.parseInt(rawStats.joins, 10);
      const leaves = Number.parseInt(rawStats.leaves, 10);
      const total = Number.parseInt(rawStats.total, 10);
      base.stats[userId] = {
        joins: Number.isFinite(joins) && joins > 0 ? joins : 0,
        leaves: Number.isFinite(leaves) && leaves > 0 ? leaves : 0,
        total: Number.isFinite(total) && total >= 0 ? total : 0,
        updatedAt: Number.isFinite(rawStats?.updatedAt) ? Number(rawStats.updatedAt) : 0
      };
    }
  }

  if (entry.attributions && typeof entry.attributions === 'object') {
    base.attributions = {};
    for (const [memberId, raw] of Object.entries(entry.attributions)) {
      if (!memberId || !raw || typeof raw !== 'object') continue;
      const inviterId = typeof raw.inviterId === 'string' ? raw.inviterId.trim() : '';
      if (!inviterId) continue;
      base.attributions[memberId] = {
        inviterId,
        code: typeof raw.code === 'string' ? raw.code.trim() : '',
        timestamp: Number.isFinite(raw.timestamp) ? Number(raw.timestamp) : Date.now()
      };
    }
  }

  return base;
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
    for (const [guildId, entry] of Object.entries(parsed ?? {})) {
      if (!guildId) continue;
      cache[guildId] = normaliseGuildEntry(entry);
    }
  } catch (error) {
    console.warn('⚠️ Davet ayarları okunamadı. Varsayılan yapı kullanılacak.', error);
    cache = {};
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(cache, null, 2);
  writing = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Davet ayarları kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writing = null;
    });

  await writing;
}

function getGuildEntry(guildId) {
  if (!guildId) return null;
  if (!cache[guildId]) {
    cache[guildId] = defaultGuildEntry();
  } else {
    cache[guildId] = normaliseGuildEntry(cache[guildId]);
  }
  return cache[guildId];
}

function updateStats(entry, inviterId, { joinDelta = 0, leaveDelta = 0 }) {
  if (!inviterId) return { previousTotal: 0, stats: { joins: 0, leaves: 0, total: 0 } };
  if (!entry.stats[inviterId]) {
    entry.stats[inviterId] = { joins: 0, leaves: 0, total: 0, updatedAt: Date.now() };
  }

  const stats = entry.stats[inviterId];
  const previousTotal = stats.total ?? Math.max(0, (stats.joins ?? 0) - (stats.leaves ?? 0));

  if (joinDelta > 0) {
    stats.joins = (stats.joins ?? 0) + joinDelta;
  }

  if (leaveDelta > 0) {
    stats.leaves = (stats.leaves ?? 0) + leaveDelta;
  }

  const computed = Math.max(0, (stats.total ?? previousTotal) + joinDelta - leaveDelta);
  stats.total = computed;
  stats.updatedAt = Date.now();

  return { previousTotal, stats: { ...stats } };
}

export async function getInviteSettings(guildId) {
  if (!guildId) return normaliseGuildEntry(null);
  await ensureLoaded();
  const entry = getGuildEntry(guildId);
  return {
    logChannelId: entry.logChannelId,
    rewards: [...entry.rewards],
    stats: { ...entry.stats },
    attributions: { ...entry.attributions }
  };
}

export async function getInviteLogChannel(guildId) {
  const settings = await getInviteSettings(guildId);
  return settings.logChannelId;
}

export async function setInviteLogChannel(guildId, channelId) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  await ensureLoaded();
  const entry = getGuildEntry(guildId);
  entry.logChannelId = typeof channelId === 'string' ? channelId.trim() : '';
  await persist();
  return entry.logChannelId;
}

export async function addInviteRewardTier(guildId, amount, roleId) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  const numericAmount = Number.parseInt(amount, 10);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Davet sınırı pozitif bir sayı olmalıdır.');
  }
  if (!roleId) {
    throw new Error('Rol kimliği gerekli.');
  }

  await ensureLoaded();
  const entry = getGuildEntry(guildId);
  const filtered = entry.rewards.filter((reward) => reward.roleId !== roleId);
  filtered.push({ roleId, amount: numericAmount });
  entry.rewards = filtered.sort((a, b) => a.amount - b.amount);
  await persist();
  return [...entry.rewards];
}

export async function removeInviteRewardTier(guildId, roleId) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  if (!roleId) throw new Error('Rol kimliği gerekli.');
  await ensureLoaded();
  const entry = getGuildEntry(guildId);
  entry.rewards = entry.rewards.filter((reward) => reward.roleId !== roleId);
  await persist();
  return [...entry.rewards];
}

export async function listInviteRewards(guildId) {
  if (!guildId) return [];
  await ensureLoaded();
  const entry = getGuildEntry(guildId);
  return [...entry.rewards];
}

export async function recordInviteJoin(guildId, { inviterId, memberId, code }) {
  if (!guildId || !inviterId || !memberId) {
    return { previousTotal: 0, stats: { joins: 0, leaves: 0, total: 0 } };
  }

  await ensureLoaded();
  const entry = getGuildEntry(guildId);
  const result = updateStats(entry, inviterId, { joinDelta: 1 });
  entry.attributions[memberId] = {
    inviterId,
    code: typeof code === 'string' ? code.trim() : '',
    timestamp: Date.now()
  };

  await persist();
  return result;
}

export async function recordInviteLeave(guildId, memberId) {
  if (!guildId || !memberId) {
    return null;
  }

  await ensureLoaded();
  const entry = getGuildEntry(guildId);
  const attribution = entry.attributions[memberId];
  if (!attribution) {
    return null;
  }

  delete entry.attributions[memberId];
  const result = updateStats(entry, attribution.inviterId, { leaveDelta: 1 });
  await persist();
  return {
    inviterId: attribution.inviterId,
    code: attribution.code,
    previousTotal: result.previousTotal,
    stats: result.stats
  };
}

export async function getInviteLeaderboard(guildId, { limit = 10 } = {}) {
  if (!guildId) return [];
  await ensureLoaded();
  const entry = getGuildEntry(guildId);
  const rows = Object.entries(entry.stats).map(([userId, stats]) => ({
    userId,
    joins: stats.joins ?? 0,
    leaves: stats.leaves ?? 0,
    total: stats.total ?? Math.max(0, (stats.joins ?? 0) - (stats.leaves ?? 0)),
    updatedAt: stats.updatedAt ?? 0
  }));

  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.joins !== a.joins) return b.joins - a.joins;
    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
  });

  return rows.slice(0, Math.max(1, limit));
}

export async function getInviteStatsForUser(guildId, userId) {
  if (!guildId || !userId) return { joins: 0, leaves: 0, total: 0 };
  await ensureLoaded();
  const entry = getGuildEntry(guildId);
  const stats = entry.stats[userId];
  if (!stats) {
    return { joins: 0, leaves: 0, total: 0 };
  }
  return {
    joins: stats.joins ?? 0,
    leaves: stats.leaves ?? 0,
    total: stats.total ?? Math.max(0, (stats.joins ?? 0) - (stats.leaves ?? 0))
  };
}

export async function getRewardRolesForInviteCount(guildId, totalInvites) {
  if (!guildId) return [];
  await ensureLoaded();
  const entry = getGuildEntry(guildId);
  if (!entry.rewards.length) return [];
  return entry.rewards.filter((reward) => totalInvites >= reward.amount).map((reward) => reward.roleId);
}

export async function clearInviteDataForGuild(guildId) {
  if (!guildId) return;
  await ensureLoaded();
  if (cache[guildId]) {
    delete cache[guildId];
    await persist();
  }
}

export async function describeInviteConfig(guildId, guild) {
  await ensureLoaded();
  const entry = getGuildEntry(guildId);
  const logChannel = entry.logChannelId
    ? guild?.channels?.cache?.get(entry.logChannelId) ?? `#${entry.logChannelId}`
    : null;

  const leaderboard = await getInviteLeaderboard(guildId, { limit: 3 });
  return {
    logChannel,
    rewards: [...entry.rewards],
    leaderboard
  };
}

export async function getInviteAttribution(guildId, memberId) {
  if (!guildId || !memberId) return null;
  await ensureLoaded();
  const entry = getGuildEntry(guildId);
  return entry.attributions[memberId] ?? null;
}
