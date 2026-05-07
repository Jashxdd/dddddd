import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getGuardConfig } from './guardConfigStorage.js';
import { isFeatureEnabled } from './featureFlags.js';

export async function sendGuardLog(client, guildId, details) {
  if (!client || !guildId) return false;
  if (!isFeatureEnabled('guard') || !isFeatureEnabled('logs')) return false;
  const config = await getGuardConfig(guildId);
  if (!config.logChannelId) return false;

  const channel = await client.channels.fetch(config.logChannelId).catch(() => null);
  if (!channel?.isTextBased()) {
    return false;
  }

  const me = channel.guild.members.me;
  if (me && !channel.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
    return false;
  }

  const embed = new EmbedBuilder()
    .setColor(details?.color ?? 0xe74c3c)
    .setTitle(details?.title ?? 'Guard Bildirimi')
    .setTimestamp();

  if (details?.description) {
    embed.setDescription(details.description);
  }

  if (Array.isArray(details?.fields)) {
    embed.addFields(details.fields.filter((field) => field?.name && field?.value));
  }

  if (details?.footer) {
    embed.setFooter(details.footer);
  }

  const payload = { embeds: [embed] };

  if (details?.content) {
    payload.content = details.content;
  }

  if (Array.isArray(details?.components) && details.components.length) {
    payload.components = details.components;
  }

  if (Array.isArray(details?.files) && details.files.length) {
    payload.files = details.files;
  }

  return channel
    .send(payload)
    .then(() => true)
    .catch((error) => {
      console.warn('Guard log mesajı gönderilirken hata oluştu:', error);
      return false;
    });
}
