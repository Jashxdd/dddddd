import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'economy.json');

let cache = { profiles: {} };
let loaded = false;
let writing = null;

function ensureProfileShape(profile = {}) {
  return {
    balance: Number.isFinite(profile.balance) && profile.balance > 0 ? Math.floor(profile.balance) : 0,
    streak: {
      count: Number.isFinite(profile?.streak?.count) && profile.streak.count > 0 ? Math.floor(profile.streak.count) : 0,
      lastClaim: Number.isFinite(profile?.streak?.lastClaim) ? Number(profile.streak.lastClaim) : 0
    },
    stats: {
      work: Number.isFinite(profile?.stats?.work) && profile.stats.work > 0 ? Math.floor(profile.stats.work) : 0,
      adventure:
        Number.isFinite(profile?.stats?.adventure) && profile.stats.adventure > 0 ? Math.floor(profile.stats.adventure) : 0,
      giftsSent:
        Number.isFinite(profile?.stats?.giftsSent) && profile.stats.giftsSent > 0 ? Math.floor(profile.stats.giftsSent) : 0,
      giftsReceived:
        Number.isFinite(profile?.stats?.giftsReceived) && profile.stats.giftsReceived > 0
          ? Math.floor(profile.stats.giftsReceived)
          : 0,
      quests: Number.isFinite(profile?.stats?.quests) && profile.stats.quests > 0 ? Math.floor(profile.stats.quests) : 0,
      investmentWins:
        Number.isFinite(profile?.stats?.investmentWins) && profile.stats.investmentWins > 0
          ? Math.floor(profile.stats.investmentWins)
          : 0,
      investmentLosses:
        Number.isFinite(profile?.stats?.investmentLosses) && profile.stats.investmentLosses > 0
          ? Math.floor(profile.stats.investmentLosses)
          : 0,
      guessPlays:
        Number.isFinite(profile?.stats?.guessPlays) && profile.stats.guessPlays > 0
          ? Math.floor(profile.stats.guessPlays)
          : 0,
      guessWins:
        Number.isFinite(profile?.stats?.guessWins) && profile.stats.guessWins > 0
          ? Math.floor(profile.stats.guessWins)
          : 0,
      wheelSpins:
        Number.isFinite(profile?.stats?.wheelSpins) && profile.stats.wheelSpins > 0
          ? Math.floor(profile.stats.wheelSpins)
          : 0,
      arenaMatches:
        Number.isFinite(profile?.stats?.arenaMatches) && profile.stats.arenaMatches > 0
          ? Math.floor(profile.stats.arenaMatches)
          : 0,
      arenaWins:
        Number.isFinite(profile?.stats?.arenaWins) && profile.stats.arenaWins > 0
          ? Math.floor(profile.stats.arenaWins)
          : 0
    },
    cooldowns: Object.fromEntries(
      Object.entries(profile.cooldowns ?? {})
        .map(([key, value]) => [key, Number.isFinite(value) ? Number(value) : 0])
        .filter(([key]) => Boolean(key))
    ),
    inventory: Object.fromEntries(
      Object.entries(profile.inventory ?? {})
        .map(([itemId, amount]) => [itemId, Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0])
        .filter(([, amount]) => amount > 0)
    )
  };
}

function getProfileCache(userId) {
  if (!cache.profiles[userId]) {
    cache.profiles[userId] = ensureProfileShape();
  }
  return cache.profiles[userId];
}

async function ensureLoaded() {
  if (loaded) return;

  if (!existsSync(storagePath)) {
    cache = { profiles: {} };
    loaded = true;
    return;
  }

  try {
    const raw = await readFile(storagePath, 'utf8');
    const parsed = JSON.parse(raw.toString());
    if (parsed && typeof parsed === 'object') {
      cache = {
        profiles: Object.fromEntries(
          Object.entries(parsed.profiles ?? {}).map(([userId, profile]) => [userId, ensureProfileShape(profile)])
        )
      };
    } else {
      cache = { profiles: {} };
    }
  } catch (error) {
    console.warn('⚠️ Ekonomi verileri okunamadı, boş veriler kullanılacak.', error);
    cache = { profiles: {} };
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(cache, null, 2);
  writing = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Ekonomi verileri kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writing = null;
    });

  await writing;
}

export async function getEconomyProfile(userId) {
  if (!userId) return ensureProfileShape();
  await ensureLoaded();
  const profile = ensureProfileShape(getProfileCache(userId));
  return JSON.parse(JSON.stringify(profile));
}

export async function modifyBalance(userId, amount) {
  if (!userId) throw new Error('Kullanıcı kimliği gerekli.');
  if (!Number.isFinite(amount)) throw new Error('Geçersiz bakiye değişim değeri.');

  await ensureLoaded();
  const profile = getProfileCache(userId);
  const nextBalance = Math.max(0, Math.floor(profile.balance + amount));
  profile.balance = nextBalance;
  await persist();
  return nextBalance;
}

export async function setBalance(userId, amount) {
  if (!userId) throw new Error('Kullanıcı kimliği gerekli.');
  if (!Number.isFinite(amount)) throw new Error('Geçersiz bakiye değeri.');

  await ensureLoaded();
  const profile = getProfileCache(userId);
  profile.balance = Math.max(0, Math.floor(amount));
  await persist();
  return profile.balance;
}

export async function recordDailyClaim(userId, timestamp = Date.now()) {
  if (!userId) throw new Error('Kullanıcı kimliği gerekli.');

  await ensureLoaded();
  const profile = getProfileCache(userId);
  const previousClaim = Number(profile.streak.lastClaim) || 0;
  const oneDay = 24 * 60 * 60 * 1000;
  const twoDays = 2 * oneDay;

  if (previousClaim && timestamp - previousClaim <= twoDays) {
    profile.streak.count = Math.min(profile.streak.count + 1, 30);
  } else {
    profile.streak.count = 1;
  }

  profile.streak.lastClaim = timestamp;
  profile.cooldowns.daily = timestamp;
  await persist();
  return { count: profile.streak.count, lastClaim: profile.streak.lastClaim };
}

export async function canClaimDaily(userId, now = Date.now()) {
  await ensureLoaded();
  const profile = getProfileCache(userId);
  const last = Number(profile.cooldowns.daily) || 0;
  const cooldown = 20 * 60 * 60 * 1000; // 20 saat

  if (!last) {
    return { available: true, remaining: 0 };
  }

  const diff = now - last;
  if (diff >= cooldown) {
    return { available: true, remaining: 0 };
  }

  return { available: false, remaining: cooldown - diff };
}

export async function canUseAction(userId, action, cooldownMs, now = Date.now()) {
  await ensureLoaded();
  const profile = getProfileCache(userId);
  const last = Number(profile.cooldowns[action]) || 0;
  if (!last) {
    return { available: true, remaining: 0 };
  }

  const diff = now - last;
  if (diff >= cooldownMs) {
    return { available: true, remaining: 0 };
  }

  return { available: false, remaining: cooldownMs - diff };
}

export async function recordActionUsage(userId, action, timestamp = Date.now()) {
  if (!userId || !action) return;
  await ensureLoaded();
  const profile = getProfileCache(userId);
  profile.cooldowns[action] = timestamp;
  await persist();
}

export async function incrementStat(userId, key, amount = 1) {
  if (!userId || !key) return;
  await ensureLoaded();
  const profile = getProfileCache(userId);
  const current = Number(profile.stats[key]) || 0;
  profile.stats[key] = Math.max(0, current + amount);
  await persist();
  return profile.stats[key];
}

export async function addInventoryItem(userId, itemId, quantity = 1) {
  if (!userId || !itemId) return { total: 0 };
  await ensureLoaded();
  const profile = getProfileCache(userId);
  const current = Number(profile.inventory[itemId]) || 0;
  const next = Math.max(0, current + quantity);
  if (next > 0) {
    profile.inventory[itemId] = next;
  } else {
    delete profile.inventory[itemId];
  }
  await persist();
  return { total: next };
}

export async function getInventory(userId) {
  await ensureLoaded();
  const profile = getProfileCache(userId);
  return { ...profile.inventory };
}

export async function getLeaderboard(limit = 10) {
  await ensureLoaded();
  const entries = Object.entries(cache.profiles)
    .map(([userId, profile]) => ({ userId, balance: Math.max(0, Math.floor(profile.balance)) }))
    .filter((entry) => entry.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, Math.max(1, Math.min(limit, 25)));

  return entries;
}

export async function getEconomySnapshot(limit = 10) {
  await ensureLoaded();

  const entries = Object.entries(cache.profiles).map(([userId, profile]) => {
    const safeProfile = ensureProfileShape(profile);
    return {
      userId,
      balance: safeProfile.balance,
      streak: safeProfile.streak.count,
      stats: {
        work: safeProfile.stats.work,
        adventure: safeProfile.stats.adventure,
        giftsSent: safeProfile.stats.giftsSent,
        giftsReceived: safeProfile.stats.giftsReceived,
        quests: safeProfile.stats.quests,
        investmentWins: safeProfile.stats.investmentWins,
        investmentLosses: safeProfile.stats.investmentLosses
      }
    };
  });

  const totalBalance = entries.reduce((sum, entry) => sum + entry.balance, 0);
  const participantCount = entries.length;
  const questCount = entries.reduce((sum, entry) => sum + entry.stats.quests, 0);
  const investmentWins = entries.reduce((sum, entry) => sum + entry.stats.investmentWins, 0);
  const investmentLosses = entries.reduce((sum, entry) => sum + entry.stats.investmentLosses, 0);
  const topStreak = entries.reduce((max, entry) => Math.max(max, entry.streak), 0);

  const topBalances = [...entries]
    .filter((entry) => entry.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, Math.max(1, Math.min(limit, 25)));

  return {
    participantCount,
    totalBalance,
    averageBalance: participantCount ? Math.floor(totalBalance / participantCount) : 0,
    topBalances,
    topStreak,
    questCount,
    investmentWins,
    investmentLosses
  };
}

export async function waitForWrites() {
  if (writing) {
    await writing;
  }
}
