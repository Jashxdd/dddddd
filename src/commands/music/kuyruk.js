import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';

function buildQueueEmbed(queue, requester) {
  const embed = new EmbedBuilder().setColor(0x3498db).setTitle('🎵 Furmin Kuyruğu');

  const nowPlaying = queue.nowPlaying;
  if (nowPlaying) {
    embed.addFields({
      name: 'Şu anda çalan',
      value: `**${nowPlaying.title ?? 'Bilinmeyen şarkı'}**` + (nowPlaying.requestedBy ? ` • ${nowPlaying.requestedBy}` : '')
    });
  } else {
    embed.addFields({ name: 'Şu anda çalan', value: 'Şu anda şarkı çalmıyor.' });
  }

  const upcoming = queue.snapshot().upcoming;
  if (upcoming.length > 0) {
    const lines = upcoming.slice(0, 10).map((track, index) => {
      const requester = track.requestedBy ? ` • ${track.requestedBy}` : '';
      return `**${index + 1}.** ${track.title ?? 'Bilinmeyen şarkı'}${requester}`;
    });
    if (upcoming.length > 10) {
      lines.push(`... ve ${upcoming.length - 10} şarkı daha`);
    }
    embed.addFields({ name: 'Sıradakiler', value: lines.join('\n') });
  } else {
    embed.addFields({ name: 'Sıradakiler', value: 'Kuyruk boş.' });
  }

  embed.setFooter({ text: `Komutu isteyen: ${requester.tag}` });
  return embed;
}

export default {
  category: 'Müzik',
  data: new SlashCommandBuilder().setName('kuyruk').setDescription('Şu anki şarkı ve sıradaki parçaları gösterir.'),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const queue = interaction.client.music.getQueue(interaction.guildId);
    if (!queue || (!queue.nowPlaying && queue.size === 0)) {
      await interaction.editReply({ content: '🎶 Şu anda aktif bir kuyruk yok.' });
      return;
    }

    const embed = buildQueueEmbed(queue, interaction.user);
    await interaction.editReply({ embeds: [embed] });
  }
};
