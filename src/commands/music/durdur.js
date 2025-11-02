import { SlashCommandBuilder, MessageFlags } from 'discord.js';

export default {
  category: 'Müzik',
  data: new SlashCommandBuilder().setName('durdur').setDescription('Kuyruğu temizler ve çalmayı durdurur.'),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const queue = interaction.client.music.getQueue(interaction.guildId);
    if (!queue || (!queue.nowPlaying && queue.size === 0)) {
      await interaction.editReply({ content: '⏹️ Durdurulacak bir şarkı yok.' });
      return;
    }

    const memberChannel = interaction.member?.voice?.channel;
    if (!memberChannel || queue.voiceChannelId !== memberChannel.id) {
      await interaction.editReply({ content: '🎧 Müzik ile aynı ses kanalında olmalısın.' });
      return;
    }

    queue.stop();
    await interaction.editReply({ content: '⏹️ Kuyruk temizlendi ve müzik durdu.' });
  }
};
