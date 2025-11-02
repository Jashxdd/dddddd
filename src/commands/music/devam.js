import { SlashCommandBuilder, MessageFlags } from 'discord.js';

export default {
  category: 'Müzik',
  data: new SlashCommandBuilder().setName('devam').setDescription('Duraklatılan şarkıyı devam ettirir.'),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const queue = interaction.client.music.getQueue(interaction.guildId);
    if (!queue || !queue.nowPlaying) {
      await interaction.editReply({ content: '▶️ Devam edecek bir şarkı yok.' });
      return;
    }

    const memberChannel = interaction.member?.voice?.channel;
    if (!memberChannel || queue.voiceChannelId !== memberChannel.id) {
      await interaction.editReply({ content: '🎧 Müzik ile aynı ses kanalında olmalısın.' });
      return;
    }

    try {
      queue.resume();
      await interaction.editReply({ content: `▶️ **${queue.nowPlaying.title ?? 'Şarkı'}** devam ediyor.` });
    } catch (error) {
      console.error('[Furmin][Music] Devam ettirme hatası:', error);
      await interaction.editReply({ content: '❌ Şarkı devam ettirilirken bir hata oluştu.' });
    }
  }
};
