import { SlashCommandBuilder, MessageFlags } from 'discord.js';

export default {
  category: 'Müzik',
  data: new SlashCommandBuilder().setName('duraklat').setDescription('Çalan şarkıyı duraklatır.'),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const queue = interaction.client.music.getQueue(interaction.guildId);
    if (!queue || !queue.nowPlaying) {
      await interaction.editReply({ content: '⏸️ Şu anda duraklatılacak bir şarkı yok.' });
      return;
    }

    try {
      queue.pause();
      await interaction.editReply({ content: '⏸️ Şarkı duraklatıldı.' });
    } catch (error) {
      console.error('[Furmin][Music] Şarkı duraklatılamadı:', error);
      await interaction.editReply({ content: '❌ Şarkı duraklatılırken bir sorun oluştu.' });
    }
  }
};
