import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { resolveTrack } from '../../music/resolveTrack.js';

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

function mapResolveError(code) {
  switch (code) {
    case 'QUERY_EMPTY':
      return '🎵 Geçerli bir şarkı ismi veya bağlantısı gir.';
    case 'SPOTIFY_LIST_UNSUPPORTED':
      return '🎵 Yalnızca Spotify şarkı bağlantıları destekleniyor.';
    case 'SPOTIFY_META_FAIL':
      return '🎵 Spotify şarkı bilgisi alınamadı. Lütfen farklı bir bağlantı dene.';
    case 'YT_NOT_FOUND_FROM_SPOTIFY':
    case 'YT_NOT_FOUND':
      return '🔍 Hiç sonuç bulunamadı, farklı bir arama yapmayı dene.';
    case 'UNSUPPORTED_URL':
      return '🌐 Yalnızca YouTube bağlantıları veya Spotify şarkıları destekleniyor.';
    default:
      return '❌ Şarkı aranırken beklenmeyen bir hata oluştu.';
  }
}

export default {
  category: 'Müzik',
  data: new SlashCommandBuilder()
    .setName('oynat')
    .setDescription('Bir şarkıyı sıraya ekler ve gerekiyorsa çalmaya başlatır.')
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Şarkı adı, YouTube bağlantısı veya Spotify şarkı bağlantısı')
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const queue = interaction.client.music.getQueue(interaction.guildId);
    const voiceCheck = ensureVoiceChannel(interaction, queue);
    if (!voiceCheck.ok) {
      await interaction.editReply({ content: voiceCheck.message });
      return;
    }

    const rawQuery = interaction.options.getString('query', true);
    const query = rawQuery.trim();
    if (!query) {
      await interaction.editReply({ content: '🎵 Geçerli bir şarkı ismi veya bağlantısı gir.' });
      return;
    }

    let track;
    try {
      track = await resolveTrack(query);
    } catch (error) {
      const message = mapResolveError(error?.code);
      if (message) {
        await interaction.editReply({ content: message });
      } else {
        console.error('[Furmin][Music] Parça çözümlenemedi:', error);
        await interaction.editReply({ content: '❌ Şarkı aranırken beklenmeyen bir hata oluştu.' });
      }
      return;
    }

    const musicQueue = interaction.client.music.ensureQueue(interaction.guildId);
    const trackData = {
      ...track,
      requestedBy: interaction.user.tag,
      requestedId: interaction.user.id,
      requestedAt: Date.now(),
      originalQuery: query
    };

    try {
      const result = await musicQueue.enqueue(trackData, {
        voiceChannel: voiceCheck.channel,
        textChannel: interaction.channel
      });

      if (result.started) {
        await interaction.editReply({
          content: `▶️ **${formatTrackTitle(trackData)}** çalmaya başladı.`
        });
      } else {
        await interaction.editReply({
          content: `✅ **${formatTrackTitle(trackData)}** sıraya eklendi. Sırada ${musicQueue.size} şarkı var.`
        });
      }
    } catch (error) {
      console.error('[Furmin][Music] Parça kuyruğa eklenemedi:', error);
      await interaction.editReply({ content: '❌ Şarkı sıraya eklenirken bir sorun oluştu.' });
    }
  }
};
