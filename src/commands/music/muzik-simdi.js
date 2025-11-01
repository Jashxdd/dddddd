import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  category: 'Müzik',
  menuGroup: 'Müzik',
  data: new SlashCommandBuilder().setName('muzik-simdi').setDescription('Şu anda çalan şarkıyı gösterir.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const snapshot = interaction.client.music.getQueueSnapshot(interaction.guildId);
    if (!snapshot?.current) {
      await interaction.reply({ content: '🎶 Şu anda çalan bir şarkı bulunmuyor.', ephemeral: true });
      return;
    }

    const track = snapshot.current;
    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle('🎧 Şu Anda Çalan')
      .setDescription(`[${track.title}](${track.url})`)
      .addFields({ name: 'Talep Eden', value: `<@${track.requestedBy}>`, inline: true })
      .setFooter({ text: 'Furmin Müzik Sistemi' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
