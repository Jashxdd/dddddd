import { ChannelType, PermissionsBitField } from 'discord.js';
import { formatUserMention, sendModerationLog } from '../../utils/modLog.js';

const SUPPORTED_TYPES = new Set([ChannelType.GuildText, ChannelType.GuildAnnouncement]);

function normaliseChannelType(channel) {
  if (!channel) return null;
  return channel.type ?? null;
}

function extractReasonParts(args, channelId) {
  if (!Array.isArray(args) || !args.length) {
    return [];
  }

  const mentionPattern = channelId ? new RegExp(`<#${channelId}>`) : null;
  return args.filter((part, index) => {
    if (!part) return false;
    if (mentionPattern && mentionPattern.test(part)) return false;
    if (index === 0 && channelId && /^\d+$/.test(part)) return false;
    return true;
  });
}

async function resolveChannel(message, args) {
  const mention = message.mentions.channels.first();
  if (mention) {
    return { channel: mention, reasonParts: extractReasonParts(args, mention.id) };
  }

  if (args[0]) {
    const cleaned = args[0].replace(/[^0-9]/g, '');
    if (cleaned) {
      const fetched = await message.guild.channels.fetch(cleaned).catch(() => null);
      if (fetched) {
        return { channel: fetched, reasonParts: args.slice(1) };
      }
    }
  }

  return { channel: message.channel, reasonParts: args };
}

export default {
  name: 'nuke',
  aliases: ['kanal-sifirla', 'kanalsifirla'],
  catalogKey: 'nuke',
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  description: 'Metin kanalını temizleyip yeni bir kopyasını oluşturur.',
  requiredPermissions: [PermissionsBitField.Flags.ManageChannels],
  async execute(message, args) {
    if (!message.guild) {
      await message.reply({
        content: 'Bu komut yalnızca sunucularda kullanılabilir.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const me = message.guild.members.me;
    if (!me?.permissions?.has(PermissionsBitField.Flags.ManageChannels)) {
      await message.reply({
        content: 'Kanalları yenilemek için gerekli yetkilere sahip değilim. Lütfen rollerimi güncelleyin.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const { channel, reasonParts } = await resolveChannel(message, args);

    if (!channel || channel.isThread?.()) {
      await message.reply({
        content: 'Belirtilen kanal bulunamadı veya desteklenmeyen bir kanal türü seçildi.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (!SUPPORTED_TYPES.has(normaliseChannelType(channel))) {
      await message.reply({
        content: 'Bu komut yalnızca metin ve duyuru kanalları için kullanılabilir.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const reason = reasonParts.join(' ').trim() || 'Sebep belirtilmedi';

    let clonedChannel = null;
    try {
      clonedChannel = await channel.clone({ reason: `Furmin nuke: ${reason}` });

      if (channel.parentId && clonedChannel.parentId !== channel.parentId) {
        await clonedChannel.setParent(channel.parentId, { lockPermissions: false }).catch(() => null);
      }

      await clonedChannel.setPosition(channel.position).catch(() => null);

      if ('topic' in channel && channel.topic && 'setTopic' in clonedChannel) {
        await clonedChannel.setTopic(channel.topic).catch(() => null);
      }

      await channel.delete(reason).catch((error) => {
        throw Object.assign(new Error('DELETE_FAILED'), { cause: error });
      });

      await clonedChannel
        .send({
          content: `🧨 Kanal temizlendi. Bu işlemi ${message.author} gerçekleştirdi.`,
          allowedMentions: { users: [], roles: [] }
        })
        .catch(() => null);

      await message.reply({
        content: `🧹 ${clonedChannel} kanalı başarıyla yenilendi.`,
        allowedMentions: { repliedUser: false }
      });

      await sendModerationLog(message.client, message.guild.id, {
        action: 'Kanal Yenileme',
        moderator: formatUserMention(message.author),
        target: `${channel.name} ➜ ${clonedChannel}`,
        reason,
        color: 0xe67e22,
        extraFields: [
          { name: 'Eski Kanal', value: `${channel.name} (${channel.id})`, inline: true },
          { name: 'Yeni Kanal', value: `${clonedChannel} (${clonedChannel.id})`, inline: true }
        ]
      });
    } catch (error) {
      if (clonedChannel && clonedChannel.deletable) {
        await clonedChannel.delete('Nuke işlemi başarısız olduğu için temizlendi.').catch(() => null);
      }

      console.error('Önek nuke komutunda hata oluştu:', error);
      await message.reply({
        content: '⚠️ Kanal yenilenirken bir sorun meydana geldi. Lütfen yetkileri kontrol edip tekrar deneyin.',
        allowedMentions: { repliedUser: false }
      });
    }
  }
};
