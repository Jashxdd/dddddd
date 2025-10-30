import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { clearModLogChannelId, getModLogChannelId } from './modLogStorage.js';

function formatUserLabel(userLike) {
  if (!userLike) {
    return 'Bilinmiyor';
  }

  const id = userLike.id ?? userLike.user?.id;
  const tag = userLike.tag ?? userLike.user?.tag ?? userLike.displayName ?? 'Bilinmiyor';

  if (!id) {
    return tag;
  }

  return `${tag} (${id})`;
}

export async function sendModerationLog(client, guildId, details) {
  if (!client || !guildId || !details) return false;

  const channelId = await getModLogChannelId(guildId);
  if (!channelId) return false;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    await clearModLogChannelId(guildId);
    return false;
  }

  const me = channel.guild.members.me;
  if (me && !channel.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages)) {
    console.warn('Mod-log kanalina mesaj gondermek icin iznim yok.');
    return false;
  }

  const embed = new EmbedBuilder()
    .setColor(details.color ?? 0xe74c3c)
    .setTimestamp();

  if (details.title) {
    embed.setTitle(details.title);
  } else if (details.action) {
    embed.setTitle(`🔔 ${details.action}`);
  }

  if (details.description) {
    embed.setDescription(details.description);
  }

  if (details.thumbnail) {
    embed.setThumbnail(details.thumbnail);
  }

  if (details.footer) {
    embed.setFooter(details.footer);
  }

  const fields = [];

  if (details.moderator) {
    fields.push({ name: 'Yetkili', value: details.moderator, inline: true });
  } else if (details.moderatorUser) {
    fields.push({ name: 'Yetkili', value: formatUserLabel(details.moderatorUser), inline: true });
  }

  if (details.target) {
    fields.push({ name: 'Hedef', value: details.target, inline: true });
  } else if (details.targetUser) {
    fields.push({ name: 'Hedef', value: formatUserLabel(details.targetUser), inline: true });
  }

  if (details.reason) {
    fields.push({ name: 'Sebep', value: details.reason, inline: false });
  }

  if (Array.isArray(details.extraFields)) {
    for (const field of details.extraFields) {
      if (field && field.name && field.value) {
        fields.push({ inline: false, ...field });
      }
    }
  }

  if (fields.length) {
    embed.addFields(fields);
  }

  const payload = {
    embeds: [embed]
  };

  if (details.content) {
    payload.content = details.content;
  }

  if (details.components) {
    payload.components = details.components;
  }

  return channel
    .send(payload)
    .then(() => true)
    .catch(async (error) => {
      console.warn('Mod-log mesajı gonderilirken hata olustu:', error);
      if (error.code === 50001 /* Missing Access */ || error.code === 50013 /* Missing Permissions */) {
        await clearModLogChannelId(guildId);
      }
      return false;
    });
}

export function formatUserMention(userLike) {
  if (!userLike) return 'Bilinmiyor';
  const id = userLike.id ?? userLike.user?.id;
  const tag = userLike.tag ?? userLike.user?.tag ?? userLike.displayName ?? 'Bilinmiyor';
  if (!id) return tag;
  return `<@${id}> (${tag} • ${id})`;
}
