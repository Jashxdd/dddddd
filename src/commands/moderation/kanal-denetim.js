import { ChannelType, EmbedBuilder, PermissionsBitField, SlashCommandBuilder } from 'discord.js';

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
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  data: new SlashCommandBuilder()
    .setName('kanal-denetim')
    .setDescription('Belirtilen kanalın denetim ayarlarını ve özetini gösterir.')
    .addChannelOption((option) =>
      option
        .setName('kanal')
        .setDescription('İncelenecek kanal')
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildVoice,
          ChannelType.GuildForum,
          ChannelType.GuildAnnouncement,
          ChannelType.GuildStageVoice
        )
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const channel = interaction.options.getChannel('kanal');
    if (!channel || !('name' in channel)) {
      await interaction.reply({ content: 'Desteklenen bir kanal seçmelisin.', ephemeral: true });
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
      embed.addFields({ name: 'Yavaş Mod', value: channel.rateLimitPerUser ? `${channel.rateLimitPerUser} saniye` : 'Kapalı', inline: true });
    }

    if ('topic' in channel && channel.topic) {
      embed.addFields({ name: 'Konu', value: channel.topic.length > 1024 ? `${channel.topic.slice(0, 1021)}...` : channel.topic });
    }

    if ('defaultAutoArchiveDuration' in channel && channel.defaultAutoArchiveDuration) {
      embed.addFields({
        name: 'Auto Archive',
        value: `${channel.defaultAutoArchiveDuration} dakika`,
        inline: true
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
