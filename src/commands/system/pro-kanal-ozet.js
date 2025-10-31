import { ChannelType, EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  data: new SlashCommandBuilder()
    .setName('pro-kanal-ozet')
    .setDescription('Sunucudaki kanal türlerinin dağılımını özetler.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const channels = interaction.guild.channels.cache;
    const totals = {
      text: channels.filter((channel) => channel.type === ChannelType.GuildText).size,
      voice: channels.filter((channel) => channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice).size,
      category: channels.filter((channel) => channel.type === ChannelType.GuildCategory).size,
      forum: channels.filter((channel) => channel.type === ChannelType.GuildForum).size,
      announcement: channels.filter((channel) => channel.type === ChannelType.GuildAnnouncement).size
    };

    const embed = new EmbedBuilder()
      .setColor(0x00cec9)
      .setTitle('🗂️ Pro Kanal Özeti')
      .setDescription('Kanal türlerinin dağılımını görüntülersin.')
      .addFields(
        { name: 'Metin Kanalları', value: `${totals.text}`, inline: true },
        { name: 'Ses/Sahne', value: `${totals.voice}`, inline: true },
        { name: 'Kategori', value: `${totals.category}`, inline: true },
        { name: 'Forum', value: `${totals.forum}`, inline: true },
        { name: 'Duyuru', value: `${totals.announcement}`, inline: true },
        { name: 'Toplam', value: `${channels.size}`, inline: true }
      )
      .setFooter({ text: 'Furmin Pro kanal raporu' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
