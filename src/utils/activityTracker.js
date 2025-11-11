import { Collection } from 'discord.js';
import { addXp, getLevelConfig } from './xpStorage.js';
import { randomInt } from './random.js';

const messageCooldowns = new Collection();
const voiceSessions = new Collection();

function buildCooldownKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

export async function handleMessageXp(message) {
  const config = getLevelConfig();
  if (!config.enabled) {
    return null;
  }

  if (!message?.guild || !message.member) {
    return null;
  }

  if (message.author?.bot) {
    return null;
  }

  const key = buildCooldownKey(message.guild.id, message.author.id);
  const lastTime = messageCooldowns.get(key) ?? 0;
  const now = Date.now();
  if (now - lastTime < config.messageCooldown * 1000) {
    return null;
  }

  const contentLength = (message.content ?? '').trim().length;
  const bonus = contentLength >= 120 ? 5 : contentLength >= 60 ? 3 : contentLength >= 20 ? 1 : 0;
  const randomBonus = randomInt(0, 3);
  const total = config.messageXp + bonus + randomBonus;

  messageCooldowns.set(key, now);
  const result = await addXp({ guildId: message.guild.id, userId: message.author.id, type: 'message', amount: total });
  return { total, result };
}

export async function handleCommandXp(interaction) {
  const config = getLevelConfig();
  if (!config.enabled) {
    return null;
  }

  if (!interaction?.guild || !interaction.user) {
    return null;
  }

  const amount = config.commandXp + randomInt(0, 5);
  const result = await addXp({ guildId: interaction.guild.id, userId: interaction.user.id, type: 'command', amount });
  return { amount, result };
}

function getVoiceKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

export function markVoiceJoin(state) {
  if (!state?.member || !state.guild) {
    return;
  }

  const config = getLevelConfig();
  if (!config.enabled) {
    return;
  }

  const key = getVoiceKey(state.guild.id, state.member.id);
  voiceSessions.set(key, Date.now());
}

export async function markVoiceLeave(state) {
  if (!state?.member || !state.guild) {
    return null;
  }

  const config = getLevelConfig();
  if (!config.enabled) {
    return null;
  }

  const key = getVoiceKey(state.guild.id, state.member.id);
  const joinedAt = voiceSessions.get(key);
  voiceSessions.delete(key);

  if (!joinedAt) {
    return null;
  }

  const diff = Date.now() - joinedAt;
  if (diff < 60_000) {
    return null;
  }

  const minutes = Math.floor(diff / 60_000);
  const amount = Math.max(config.voiceXpPerMinute * minutes, config.voiceXpPerMinute);
  const result = await addXp({ guildId: state.guild.id, userId: state.member.id, type: 'voice', amount });
  return { minutes, amount, result };
}

export async function finalizeVoiceSessions() {
  const now = Date.now();
  const promises = [];
  for (const [key, joinedAt] of voiceSessions.entries()) {
    const diff = now - joinedAt;
    if (diff < 60_000) {
      continue;
    }

    const [guildId, userId] = key.split(':');
    const minutes = Math.floor(diff / 60_000);
    const config = getLevelConfig();
    const amount = Math.max(config.voiceXpPerMinute * minutes, config.voiceXpPerMinute);
    promises.push(addXp({ guildId, userId, type: 'voice', amount }));
    voiceSessions.delete(key);
  }

  await Promise.allSettled(promises);
}
