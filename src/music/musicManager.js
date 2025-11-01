import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel
} from '@discordjs/voice';
import play from 'play-dl';

function safeTitle(text) {
  if (!text) return 'Bilinmeyen Parça';
  return text.length > 256 ? `${text.slice(0, 253)}...` : text;
}

async function ensurePlaySession() {
  if (typeof play.is_expired !== 'function') {
    return;
  }

  try {
    const expired = play.is_expired();

    if (!expired) {
      return;
    }

    if (typeof play.refreshToken === 'function') {
      await play.refreshToken();
    }
  } catch (error) {
    const message = error?.message ?? '';

    if (message.toLowerCase().includes('expiry') || message.toLowerCase().includes('token')) {
      console.warn('Spotify oturum bilgisi bulunamadı; anonim akış kullanılacak.');
      return;
    }

    console.warn('Spotify oturum kontrolü sırasında beklenmeyen bir hata oluştu:', error);
  }
}

async function fetchYoutubeInfo(url) {
  const info = await play.video_basic_info(url);

  return {
    title: safeTitle(info?.video_details?.title ?? url),
    url,
    durationInSec: Number.parseInt(info?.video_details?.durationInSec ?? '0', 10) || 0,
    author: info?.video_details?.channel?.name ?? 'Bilinmeyen Kanal'
  };
}

async function resolveSpotifyTrack(url) {
  const spotifyInfo = await play.spotify(url);
  const primaryArtist = spotifyInfo?.artists?.[0]?.name ?? '';
  const searchTerm = [spotifyInfo?.name, primaryArtist].filter(Boolean).join(' ');

  if (!searchTerm) {
    throw new Error('Spotify parçası çözümlenemedi.');
  }

  return resolveYoutubeSearch(searchTerm, spotifyInfo?.name ?? searchTerm);
}

async function resolveYoutubeSearch(searchTerm, fallbackTitle) {
  const results = await play.search(searchTerm, { limit: 1, source: { youtube: 'video' } });
  if (!results.length) {
    throw new Error('Parça bulunamadı. Farklı bir arama deneyin.');
  }

  const chosen = results[0];
  const info = await fetchYoutubeInfo(chosen.url);

  if (fallbackTitle && !info.title) {
    info.title = safeTitle(fallbackTitle);
  }

  return info;
}

async function resolveTrack(query) {
  await ensurePlaySession();

  const validation = typeof play.validate === 'function' ? play.validate(query) : play.yt_validate(query);

  if (validation === 'yt_video' || validation === 'video') {
    return fetchYoutubeInfo(query);
  }

  if (validation === 'sp_track') {
    return resolveSpotifyTrack(query);
  }

  return resolveYoutubeSearch(query, query);
}

function createQueue(guildId, voiceChannel, textChannel) {
  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause
    }
  });

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: true
  });

  return {
    guildId,
    voiceChannelId: voiceChannel.id,
    textChannelId: textChannel.id,
    connection,
    player,
    tracks: [],
    current: null,
    requestedBy: null,
    disconnectTimer: null
  };
}

async function createResource(url) {
  await ensurePlaySession();
  const stream = await play.stream(url, { discordPlayerCompatibility: true });
  return createAudioResource(stream.stream, { inputType: stream.type, inlineVolume: true });
}

export class MusicManager {
  constructor(client) {
    this.client = client;
    this.queues = new Map();
  }

  clearAutoDisconnect(queue) {
    if (queue.disconnectTimer) {
      clearTimeout(queue.disconnectTimer);
      queue.disconnectTimer = null;
    }
  }

  scheduleAutoDisconnect(queue) {
    this.clearAutoDisconnect(queue);
    queue.disconnectTimer = setTimeout(() => {
      const current = this.queues.get(queue.guildId);
      if (!current) return;
      if (current.current || current.tracks.length) {
        return;
      }
      this.destroyQueue(queue.guildId);
    }, 2_000);

    if (typeof queue.disconnectTimer.unref === 'function') {
      queue.disconnectTimer.unref();
    }
  }

  getQueue(guildId) {
    return this.queues.get(guildId) ?? null;
  }

  async ensureQueue(guild, voiceChannel, textChannel) {
    let queue = this.queues.get(guild.id);
    if (queue) {
      if (queue.voiceChannelId !== voiceChannel.id) {
        queue.connection.destroy();
        queue.player.stop();
        queue = null;
      }
    }

    if (!queue) {
      queue = createQueue(guild.id, voiceChannel, textChannel);
      this.queues.set(guild.id, queue);

      try {
        await entersState(queue.connection, VoiceConnectionStatus.Ready, 10_000);
      } catch (error) {
        this.destroyQueue(guild.id);
        throw new Error('Ses kanalına bağlanırken sorun yaşandı.');
      }

      queue.connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(queue.connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(queue.connection, VoiceConnectionStatus.Connecting, 5_000)
          ]);
        } catch (error) {
          this.destroyQueue(guild.id);
        }
      });

      queue.player.on(AudioPlayerStatus.Idle, () => {
        queue.current = null;
        queue.requestedBy = null;
        queue.tracks.shift();
        this.playNext(guild.id).catch((error) => {
          console.error('Sıradaki parça oynatılırken hata oluştu:', error);
        });
      });

      queue.player.on('error', (error) => {
        console.error('Müzik oynatılırken hata oluştu:', error);
        queue.tracks.shift();
        this.playNext(guild.id).catch(() => {});
      });

      queue.connection.subscribe(queue.player);
    }

    return queue;
  }

  async playNext(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue) return null;

    if (!queue.tracks.length) {
      queue.current = null;
      queue.requestedBy = null;
      queue.player.stop(true);
      this.scheduleAutoDisconnect(queue);
      return null;
    }

    const track = queue.tracks[0];
    let resource;
    try {
      resource = await createResource(track.url);
    } catch (error) {
      console.error('Parça kaynağı oluşturulurken hata oluştu:', error);
      queue.tracks.shift();
      if (!queue.tracks.length) {
        queue.current = null;
        queue.requestedBy = null;
        this.scheduleAutoDisconnect(queue);
        throw new Error('Parça başlatılırken bir sorun yaşandı. Lütfen farklı bir şarkı deneyin.');
      }

      return this.playNext(guildId);
    }

    this.clearAutoDisconnect(queue);
    queue.player.play(resource);
    queue.current = track;
    queue.requestedBy = track.requestedBy;
    return track;
  }

  destroyQueue(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue) return;
    this.clearAutoDisconnect(queue);
    queue.player.stop(true);
    try {
      queue.connection.destroy();
    } catch (error) {
      console.warn('Ses bağlantısı kapatılırken hata oluştu:', error);
    }
    this.queues.delete(guildId);
  }

  leave(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue) {
      throw new Error('Bot şu anda herhangi bir ses kanalında değil.');
    }

    this.destroyQueue(guildId);
  }

  async addTrack({ guild, voiceChannel, textChannel, query, requestedBy }) {
    const track = await resolveTrack(query);
    const queue = await this.ensureQueue(guild, voiceChannel, textChannel);

    queue.tracks.push({ ...track, requestedBy });
    if (!queue.current) {
      await this.playNext(guild.id);
      return { track, queued: false };
    }

    return { track, queued: true, position: queue.tracks.length - 1 };
  }

  async skip(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue) throw new Error('Aktif bir müzik kuyruğu bulunmuyor.');
    if (!queue.tracks.length) throw new Error('Atlanacak parça yok.');
    queue.player.stop(true);
    return this.playNext(guildId);
  }

  pause(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue?.current) throw new Error('Çalan bir parça bulunmuyor.');
    queue.player.pause(true);
    return queue.current;
  }

  resume(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue?.current) throw new Error('Devam ettirilecek bir parça yok.');
    queue.player.unpause();
    return queue.current;
  }

  stop(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue) throw new Error('Aktif bir müzik kuyruğu bulunmuyor.');
    queue.tracks = [];
    queue.player.stop(true);
    this.destroyQueue(guildId);
  }

  getQueueSnapshot(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue) return null;
    return {
      current: queue.current,
      upcoming: queue.tracks.slice(1)
    };
  }
}
