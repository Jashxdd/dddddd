import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'giveaways.json');

let cache = {};
let loaded = false;
let writing = null;

function ensureGuild(guildId) {
  if (!cache[guildId]) {
    cache[guildId] = {};
  }
  return cache[guildId];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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
    console.warn('⚠️ Çekiliş verileri okunamadı. Varsayılan değerler kullanılacak.', error);
    cache = {};
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(cache, null, 2);
  writing = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Çekiliş verileri kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writing = null;
    });
  await writing;
}

async function createGiveaway(data) {
  await ensureLoaded();
  const id = data.id ?? crypto.randomUUID();
  const guild = ensureGuild(data.guildId);
  guild[id] = {
    id,
    guildId: data.guildId,
    channelId: data.channelId,
    messageId: data.messageId,
    createdBy: data.createdBy,
    prize: data.prize,
    winners: data.winners ?? 1,
    endsAt: data.endsAt,
    createdAt: data.createdAt ?? Date.now(),
    participants: Array.isArray(data.participants) ? data.participants : [],
    ended: Boolean(data.ended),
    winnerIds: Array.isArray(data.winnerIds) ? data.winnerIds : []
  };
  await persist();
  return clone(guild[id]);
}

async function getGiveaway(guildId, giveawayId) {
  await ensureLoaded();
  return clone(cache[guildId]?.[giveawayId] ?? null);
}

async function updateGiveaway(guildId, giveawayId, updates) {
  await ensureLoaded();
  const guild = ensureGuild(guildId);
  const existing = guild[giveawayId];
  if (!existing) return null;
  guild[giveawayId] = { ...existing, ...updates };
  await persist();
  return clone(guild[giveawayId]);
}

async function listActiveGiveaways(guildId) {
  await ensureLoaded();
  const guild = cache[guildId];
  if (!guild) return [];
  return Object.values(guild)
    .filter((item) => !item.ended)
    .map((item) => clone(item));
}

async function listGiveaways(guildId) {
  await ensureLoaded();
  const guild = cache[guildId];
  if (!guild) return [];
  return Object.values(guild).map((item) => clone(item));
}

async function addParticipant(guildId, giveawayId, userId) {
  if (!guildId || !giveawayId || !userId) return null;
  await ensureLoaded();
  const guild = ensureGuild(guildId);
  const giveaway = guild[giveawayId];
  if (!giveaway) return null;
  const participants = new Set(giveaway.participants ?? []);
  participants.add(userId);
  giveaway.participants = Array.from(participants);
  await persist();
  return clone(giveaway);
}

async function removeParticipant(guildId, giveawayId, userId) {
  if (!guildId || !giveawayId || !userId) return null;
  await ensureLoaded();
  const guild = ensureGuild(guildId);
  const giveaway = guild[giveawayId];
  if (!giveaway) return null;
  giveaway.participants = (giveaway.participants ?? []).filter((id) => id !== userId);
  await persist();
  return clone(giveaway);
}

async function endGiveaway(guildId, giveawayId, winnerIds = []) {
  await ensureLoaded();
  const guild = ensureGuild(guildId);
  const giveaway = guild[giveawayId];
  if (!giveaway) return null;
  giveaway.ended = true;
  giveaway.winnerIds = winnerIds;
  await persist();
  return clone(giveaway);
}

async function deleteGiveaway(guildId, giveawayId) {
  await ensureLoaded();
  const guild = ensureGuild(guildId);
  if (!guild[giveawayId]) return false;
  delete guild[giveawayId];
  await persist();
  return true;
}

async function findGiveawayByMessage(guildId, messageId) {
  await ensureLoaded();
  const guild = cache[guildId];
  if (!guild) return null;
  return (
    Object.values(guild).find((item) => item.messageId === messageId) ?? null
  );
}

async function getGiveawayMap() {
  await ensureLoaded();
  return clone(cache);
}

export {
  createGiveaway,
  getGiveaway,
  updateGiveaway,
  listActiveGiveaways,
  listGiveaways,
  addParticipant,
  removeParticipant,
  endGiveaway,
  deleteGiveaway,
  findGiveawayByMessage,
  getGiveawayMap
};

const giveawayStorage = {
  createGiveaway,
  getGiveaway,
  updateGiveaway,
  listActiveGiveaways,
  listGiveaways,
  addParticipant,
  removeParticipant,
  endGiveaway,
  deleteGiveaway,
  findGiveawayByMessage,
  getGiveawayMap
};

export default giveawayStorage;
