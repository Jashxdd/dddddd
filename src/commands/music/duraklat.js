import { SlashCommandBuilder, MessageFlags } from 'discord.js';

export default {
  category: 'Müzik',
  data: new SlashCommandBuilder().setName('duraklat').setDescription('Çalan şarkıyı duraklatır.'),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const queue = interaction.client.music.getQueue(interaction.guildId);
    if (!queue || !queue.nowPlaying) {
      await interaction.editReply({ content: '⏸️ Duraklatılacak bir şarkı yok.' });
      return;
    }

    const memberChannel = interaction.member?.voice?.channel;
    if (!memberChannel || queue.voiceChannelId !== memberChannel.id) {
      await interaction.editReply({ content: '🎧 Müzik ile aynı ses kanalında olmalısın.' });
      return;
    }

    try {
      queue.pause();
      await interaction.editReply({ content: `⏸️ **${queue.nowPlaying.title ?? 'Şarkı'}** duraklatıldı.` });
    } catch (error) {
      console.error('[Furmin][Music] Duraklatma hatası:', error);
      await interaction.editReply({ content: '❌ Şarkı duraklatılırken bir hata oluştu.' });
    }
  }
};
