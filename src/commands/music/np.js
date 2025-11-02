import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';

export default {
  category: 'Müzik',
  data: new SlashCommandBuilder().setName('np').setDescription('Şu anda çalan şarkıyı gösterir.'),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const queue = interaction.client.music.getQueue(interaction.guildId);
    if (!queue || !queue.nowPlaying) {
      await interaction.editReply({ content: '🎵 Şu anda çalan bir şarkı yok.' });
      return;
    }

    const track = queue.nowPlaying;
    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle('🎶 Şimdi Çalan')
      .setDescription(`**${track.title ?? 'Bilinmeyen şarkı'}**`)
      .setFooter({ text: track.requestedBy ? `İsteyen: ${track.requestedBy}` : 'Furmin Müzik Sistemi' });

    await interaction.editReply({ embeds: [embed] });
  }
};
