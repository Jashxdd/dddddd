import { SlashCommandBuilder, MessageFlags } from 'discord.js';

export default {
  category: 'Müzik',
  data: new SlashCommandBuilder().setName('devam').setDescription('Duraklatılan şarkıyı devam ettirir.'),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const queue = interaction.client.music.getQueue(interaction.guildId);
    if (!queue || !queue.nowPlaying) {
      await interaction.editReply({ content: '▶️ Devam ettirilecek bir şarkı bulunmuyor.' });
      return;
    }

    try {
      queue.resume();
      await interaction.editReply({ content: '▶️ Şarkı kaldığı yerden devam ediyor.' });
    } catch (error) {
      console.error('[Furmin][Music] Şarkı devam ettirilemedi:', error);
      await interaction.editReply({ content: '❌ Şarkı devam ettirilirken bir sorun oluştu.' });
    }
  }
};
