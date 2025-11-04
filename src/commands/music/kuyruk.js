import { SlashCommandBuilder, MessageFlags } from 'discord.js';

function describeTrack(track, index) {
  const title = track.title ?? track.requestedTitle ?? track.url;
  const requester = track.requestedBy ? ` • İsteyen: ${track.requestedBy}` : '';
  return `${index}. ${title}${requester}`;
}

export default {
  category: 'Müzik',
  data: new SlashCommandBuilder().setName('kuyruk').setDescription('Müzik kuyruğunu gösterir.'),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const queue = interaction.client.music.getQueue(interaction.guildId);
    if (!queue || (!queue.nowPlaying && queue.size === 0)) {
      await interaction.editReply({ content: '📭 Şu anda çalan veya sırada bekleyen bir şarkı yok.' });
      return;
    }

    const { nowPlaying, upcoming } = queue.snapshot();
    const lines = [];

    if (nowPlaying) {
      lines.push(`▶️ Şimdi çalan: **${nowPlaying.title ?? nowPlaying.requestedTitle ?? nowPlaying.url}**`);
    }

    if (upcoming.length) {
      lines.push('', '🔜 Sıradakiler:');
      upcoming.forEach((track, index) => {
        lines.push(describeTrack(track, index + 1));
      });
    }

    await interaction.editReply({ content: lines.join('\n') });
  }
};
