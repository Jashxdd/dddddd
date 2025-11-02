import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { resolveTrack, TrackResolutionError } from '../../music/trackResolver.js';

function formatTrackTitle(track) {
  if (!track) return 'Bilinmeyen şarkı';
  return track.title ?? track.requestedTitle ?? track.url;
}

function ensureVoiceChannel(interaction, queue) {
  const memberChannel = interaction.member?.voice?.channel;
  if (!memberChannel) {
    return { ok: false, message: '🎧 Önce bir ses kanalına katılmalısın.' };
  }

  if (queue?.voiceChannelId && queue.voiceChannelId !== memberChannel.id) {
    return {
      ok: false,
      message: '🎶 Müzik şu anda başka bir kanalda çalıyor. Lütfen aynı kanala katıl.'
    };
  }

  return { ok: true, channel: memberChannel };
}

export default {
  category: 'Müzik',
  data: new SlashCommandBuilder()
    .setName('oynat')
    .setDescription('Bir şarkıyı sıraya ekleyip çalmaya başlatır.')
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Şarkı adı, YouTube bağlantısı veya Spotify şarkı bağlantısı')
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const rawQuery = interaction.options.getString('query', true);
    const query = rawQuery.trim();
    if (!query) {
      await interaction.editReply({ content: '🎵 Geçerli bir şarkı ismi veya bağlantısı gir.' });
      return;
    }

    const existingQueue = interaction.client.music.getQueue(interaction.guildId);
    const voiceCheck = ensureVoiceChannel(interaction, existingQueue);
    if (!voiceCheck.ok) {
      await interaction.editReply({ content: voiceCheck.message });
      return;
    }

    let track;
    try {
      track = await resolveTrack(query);
    } catch (error) {
      if (error instanceof TrackResolutionError) {
        await interaction.editReply({ content: `⚠️ ${error.message}` });
        return;
      }

      console.error('[Furmin][Music] Parça çözümlenemedi:', error);
      await interaction.editReply({ content: '❌ Şarkı aranırken beklenmeyen bir hata oluştu.' });
      return;
    }

    const queue = interaction.client.music.ensureQueue(interaction.guildId);

    const trackData = {
      ...track,
      requestedBy: interaction.user.tag,
      requestedId: interaction.user.id,
      requestedAt: Date.now(),
      originalQuery: query
    };

    try {
      const result = await queue.enqueue(trackData, {
        voiceChannel: voiceCheck.channel,
        textChannel: interaction.channel
      });

      if (result.started) {
        await interaction.editReply({
          content: `▶️ **${formatTrackTitle(trackData)}** çalmaya başladı.`
        });
      } else {
        await interaction.editReply({
          content: `✅ **${formatTrackTitle(trackData)}** sıraya eklendi. Şu anda ${queue.size} şarkı bekliyor.`
        });
      }
    } catch (error) {
      console.error('[Furmin][Music] Parça kuyruğa eklenemedi:', error);
      await interaction.editReply({ content: '❌ Şarkı sıraya eklenirken hata oluştu.' });
    }
  }
};
