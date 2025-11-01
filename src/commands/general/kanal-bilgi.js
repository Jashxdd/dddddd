import { ChannelType, EmbedBuilder, SlashCommandBuilder } from 'discord.js';

function formatChannelType(type) {
  const map = {
    [ChannelType.GuildText]: 'Metin Kanalı',
    [ChannelType.GuildVoice]: 'Ses Kanalı',
    [ChannelType.GuildAnnouncement]: 'Duyuru Kanalı',
    [ChannelType.GuildStageVoice]: 'Sahne Kanalı',
    [ChannelType.GuildForum]: 'Forum Kanalı',
    [ChannelType.GuildCategory]: 'Kategori',
    [ChannelType.GuildDirectory]: 'Keşfetme Kanalı'
  };

  return map[type] ?? 'Bilinmeyen';
}

export default {
  category: 'Genel',
  data: new SlashCommandBuilder()
    .setName('kanal-bilgi')
    .setDescription('Bir kanalın detaylı bilgilerini gösterir.')
    .addChannelOption((option) =>
      option
        .setName('kanal')
        .setDescription('Bilgilerini görmek istediğiniz kanal (boş bırakılırsa bulunduğunuz kanal)')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const channel =
      interaction.options.getChannel('kanal') ??
      (interaction.channel?.isDMBased() ? null : interaction.channel);

    if (!channel || channel.isDMBased()) {
      await interaction.reply({ content: 'Lütfen bir sunucu kanalı belirtin.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x95a5a6)
      .setTitle(`#${channel.name}`)
      .setDescription(`${formatChannelType(channel.type)} hakkında bilgiler`)
      .addFields(
        { name: 'Kanal ID', value: channel.id, inline: true },
        {
          name: 'Oluşturulma',
          value: channel.createdTimestamp
            ? `<t:${Math.floor(channel.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(channel.createdTimestamp / 1000)}:R>)`
            : 'Bilinmiyor',
          inline: true
        },
        {
          name: 'Kategori',
          value: channel.parent ? `${channel.parent.name} (${channel.parentId})` : 'Kategoriye bağlı değil',
          inline: true
        }
      )
      .setFooter({ text: `${interaction.guild.name} • Kanal Bilgisi` })
      .setTimestamp();

    if ('topic' in channel && channel.topic) {
      embed.addFields({ name: 'Konu', value: channel.topic.slice(0, 1024) });
    }

    if ('nsfw' in channel) {
      embed.addFields({ name: 'NSFW', value: channel.nsfw ? '🔞 Evet' : '✅ Hayır', inline: true });
    }

    if ('rateLimitPerUser' in channel && typeof channel.rateLimitPerUser === 'number') {
      const slowmode = channel.rateLimitPerUser;
      embed.addFields({ name: 'Yavaş Mod', value: slowmode ? `${slowmode} saniye` : 'Kapalı', inline: true });
    }

    if ('bitrate' in channel && channel.bitrate) {
      embed.addFields({ name: 'Bit hızı', value: `${channel.bitrate / 1000} kbps`, inline: true });
    }

    if ('userLimit' in channel && channel.userLimit) {
      embed.addFields({ name: 'Kullanıcı Limiti', value: `${channel.userLimit}`, inline: true });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
