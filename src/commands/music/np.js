import { SlashCommandBuilder, MessageFlags } from 'discord.js';

export default {
  category: 'Müzik',
  data: new SlashCommandBuilder().setName('np').setDescription('Şu anda çalan şarkıyı gösterir.'),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const queue = interaction.client.music.getQueue(interaction.guildId);
    if (!queue || !queue.nowPlaying) {
      await interaction.editReply({ content: '▶️ Şu anda çalan bir şarkı bulunmuyor.' });
      return;
    }

    const track = queue.nowPlaying;
    const title = track.title ?? track.requestedTitle ?? track.url;
    const requester = track.requestedBy ? ` • İsteyen: ${track.requestedBy}` : '';

    await interaction.editReply({ content: `🎶 Şu anda çalan: **${title}**${requester}` });
  }
};
