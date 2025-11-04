import { SlashCommandBuilder, MessageFlags } from 'discord.js';

export default {
  category: 'Müzik',
  data: new SlashCommandBuilder().setName('durdur').setDescription('Kuyruğu temizler ve çalmayı durdurur.'),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const queue = interaction.client.music.getQueue(interaction.guildId);
    if (!queue || (!queue.nowPlaying && queue.size === 0)) {
      await interaction.editReply({ content: '⏹️ Durdurulacak bir şarkı bulunmuyor.' });
      return;
    }

    try {
      queue.stop();
      await interaction.editReply({ content: '⏹️ Tüm şarkılar durduruldu ve kuyruk temizlendi.' });
    } catch (error) {
      console.error('[Furmin][Music] Kuyruk durdurulamadı:', error);
      await interaction.editReply({ content: '❌ Müzik durdurulurken bir sorun oluştu.' });
    }
  }
};
