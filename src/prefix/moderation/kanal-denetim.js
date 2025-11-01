import { ChannelType, EmbedBuilder, PermissionsBitField } from 'discord.js';

function formatChannelType(type) {
  switch (type) {
    case ChannelType.GuildText:
      return 'Metin Kanalı';
    case ChannelType.GuildVoice:
      return 'Ses Kanalı';
    case ChannelType.GuildCategory:
      return 'Kategori';
    case ChannelType.GuildForum:
      return 'Forum Kanalı';
    case ChannelType.GuildAnnouncement:
      return 'Duyuru Kanalı';
    case ChannelType.GuildStageVoice:
      return 'Sahne Kanalı';
    default:
      return 'Diğer';
  }
}

export default {
  name: 'kanal-denetim',
  aliases: ['kanaldenetim', 'kdenetim'],
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  description: 'Belirtilen kanalın denetim ayarlarını ve özetini gösterir.',
  requiredPermissions: [PermissionsBitField.Flags.ManageChannels],
  async execute(message, args) {
    const channelMention = message.mentions.channels.first();
    const channelId = channelMention?.id ?? args[0];

    if (!channelId) {
      await message.reply({
        content: '⛔ İnceleyeceğin kanalı etiketlemeli veya kanal ID\'sini yazmalısın.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const channel =
      channelMention ?? (await message.guild.channels.fetch(channelId).catch(() => null));

    if (!channel || !('name' in channel)) {
      await message.reply({
        content: 'Desteklenen bir kanal bulunamadı.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x1f618d)
      .setTitle('📡 Kanal Denetim Özeti')
      .addFields(
        { name: 'Kanal', value: `${channel} (${channel.id})` },
        { name: 'Tür', value: formatChannelType(channel.type), inline: true },
        { name: 'NSFW', value: channel.nsfw ? 'Evet' : 'Hayır', inline: true }
      )
      .setFooter({ text: 'Furmin kanal denetim aracı' })
      .setTimestamp();

    if ('rateLimitPerUser' in channel && typeof channel.rateLimitPerUser === 'number') {
      embed.addFields({
        name: 'Yavaş Mod',
        value: channel.rateLimitPerUser ? `${channel.rateLimitPerUser} saniye` : 'Kapalı',
        inline: true
      });
    }

    if ('topic' in channel && channel.topic) {
      embed.addFields({
        name: 'Konu',
        value: channel.topic.length > 1024 ? `${channel.topic.slice(0, 1021)}...` : channel.topic
      });
    }

    if ('defaultAutoArchiveDuration' in channel && channel.defaultAutoArchiveDuration) {
      embed.addFields({
        name: 'Auto Archive',
        value: `${channel.defaultAutoArchiveDuration} dakika`,
        inline: true
      });
    }

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
