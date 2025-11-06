import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { isFeatureEnabled } from './featureFlags.js';

async function resolveLogChannel(client) {
  if (!config.botLogChannelId) {
    return null;
  }

  const existing = client.channels.cache.get(config.botLogChannelId);
  if (existing?.isTextBased?.()) {
    return existing;
  }

  const fetched = await client.channels.fetch(config.botLogChannelId).catch(() => null);
  if (!fetched?.isTextBased?.()) {
    return null;
  }

  return fetched;
}

export async function sendBotLog(client, payload) {
  if (!isFeatureEnabled('logs')) {
    return false;
  }

  const channel = await resolveLogChannel(client);
  if (!channel) {
    return false;
  }

  const messagePayload = payload instanceof EmbedBuilder ? { embeds: [payload] } : payload;

  await channel.send(messagePayload).catch((error) => {
    console.error('Bot log mesajı gönderilirken hata oluştu:', error);
  });

  return true;
}
