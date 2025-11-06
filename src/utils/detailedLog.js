import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getDetailedLogChannel } from './detailedLogStorage.js';
import { isFeatureEnabled } from './featureFlags.js';

export async function sendDetailedLog(client, guildId, category, details) {
  if (!client || !guildId || !category) return false;
  if (!isFeatureEnabled('logs')) return false;

  const channelId = await getDetailedLogChannel(guildId, category);
  if (!channelId) return false;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    return false;
  }

  const me = channel.guild.members.me;
  if (me && !channel.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
    return false;
  }

  const embed = new EmbedBuilder()
    .setColor(details?.color ?? 0x2c3e50)
    .setTimestamp();

  if (details?.title) {
    embed.setTitle(details.title);
  }

  if (details?.description) {
    embed.setDescription(details.description);
  }

  if (Array.isArray(details?.fields)) {
    embed.addFields(details.fields.filter((field) => field?.name && field?.value));
  }

  if (details?.thumbnail) {
    embed.setThumbnail(details.thumbnail);
  }

  if (details?.footer) {
    embed.setFooter(details.footer);
  }

  const payload = { embeds: [embed] };
  if (details?.components) {
    payload.components = details.components;
  }

  return channel.send(payload).then(() => true).catch(() => false);
}
