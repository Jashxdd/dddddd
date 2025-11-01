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

function extractYoutubeId(input) {
  try {
    const url = new URL(input);
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.replace(/\//g, '').trim() || null;
    }

    if (url.searchParams.has('v')) {
      return url.searchParams.get('v');
    }

    const shortsMatch = url.pathname.match(/\/shorts\/([^/]+)/);
    if (shortsMatch) {
      return shortsMatch[1];
    }

    const embedMatch = url.pathname.match(/\/embed\/([^/]+)/);
    if (embedMatch) {
      return embedMatch[1];
    }
  } catch (error) {
    return null;
  }

  return null;
}

async function fetchYoutubeInfo(url, fallbackTitle) {
  await ensurePlaySession();

  async function loadWithVideoInfo(targetUrl) {
    const info = await play.video_info(targetUrl);
    const details = info?.video_details ?? info?.videoDetails ?? {};

    return {
      title: safeTitle(details.title ?? fallbackTitle ?? targetUrl),
      url: targetUrl,
      durationInSec: Number.parseInt(details.durationInSec ?? details.lengthSeconds ?? '0', 10) || 0,
      author: details?.channel?.name ?? details?.author?.name ?? 'Bilinmeyen Kanal'
    };
  }

  try {
    return await loadWithVideoInfo(url);
  } catch (primaryError) {
    try {
      const basic = await play.video_basic_info(url);
      const details = basic?.video_details ?? basic?.videoDetails ?? {};
      return {
        title: safeTitle(details.title ?? fallbackTitle ?? url),
        url,
        durationInSec: Number.parseInt(details.durationInSec ?? details.lengthSeconds ?? '0', 10) || 0,
        author: details?.channel?.name ?? details?.author?.name ?? 'Bilinmeyen Kanal'
      };
    } catch (secondaryError) {
      const videoId = extractYoutubeId(url);
      if (videoId) {
        try {
          return await loadWithVideoInfo(`https://www.youtube.com/watch?v=${videoId}`);
        } catch (idError) {
          console.warn('YouTube verisi video kimliği ile çözümlenemedi:', idError);
        }
      }

      console.warn('YouTube verisi alınamadı. Orijinal hata:', primaryError, secondaryError);
      throw new Error('YouTube verileri alınamadı. Lütfen farklı bir bağlantı veya arama deneyin.');
    }
  }
}

async function resolveSpotifyTrack(url) {
  let spotifyInfo;
  try {
    spotifyInfo = await play.spotify(url);
  } catch (error) {
    console.warn('Spotify bağlantısı çözümlenemedi:', error);
    throw new Error('Spotify bağlantısı çözümlenemedi. Lütfen bağlantıyı kontrol edin veya farklı bir şarkı deneyin.');
  }

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
  return fetchYoutubeInfo(chosen.url, fallbackTitle);
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

async function waitForConnectionReady(queue) {
  const { connection, voiceChannelId } = queue;
  if (!connection) {
    throw new Error('Ses bağlantısı oluşturulamadı.');
  }

  const timeouts = [12_000, 18_000];
  let lastError = null;

  for (const timeout of timeouts) {
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, timeout);
      return;
    } catch (error) {
      lastError = error;

      if (connection.state.status === VoiceConnectionStatus.Destroyed) {
        break;
      }

      if (typeof connection.rejoin === 'function') {
        try {
          connection.rejoin({
            channelId: voiceChannelId,
            selfDeaf: true,
            selfMute: false
          });
        } catch (rejoinError) {
          lastError = rejoinError;
          break;
        }
      }
    }
  }

  throw lastError ?? new Error('Ses kanalına bağlanırken sorun yaşandı.');
}

async function createResource(url) {
  await ensurePlaySession();
  try {
    const stream = await play.stream(url, { discordPlayerCompatibility: true, quality: 2 });
    return createAudioResource(stream.stream, { inputType: stream.type, inlineVolume: true });
  } catch (error) {
    console.error('Akış oluşturulurken hata oluştu:', error);
    throw new Error('Akış başlatılırken beklenmeyen bir hata oluştu.');
  }
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
        this.destroyQueue(guild.id);
        queue = null;
      } else {
        queue.textChannelId = textChannel.id;
      }
    }

    if (!queue) {
      queue = createQueue(guild.id, voiceChannel, textChannel);
      this.queues.set(guild.id, queue);

      try {
        await waitForConnectionReady(queue);
      } catch (error) {
        this.destroyQueue(guild.id);
        throw new Error(error?.message ?? 'Ses kanalına bağlanırken sorun yaşandı.');
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

    queue.textChannelId = textChannel.id;
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

    try {
      await waitForConnectionReady(queue);
    } catch (error) {
      console.error('Ses bağlantısı hazır hale getirilemedi:', error);
      this.destroyQueue(guildId);
      throw new Error('Ses kanalına bağlanırken sorun yaşandı. Lütfen birkaç saniye sonra tekrar deneyin.');
    }

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
    let track;
    try {
      track = await resolveTrack(query);
    } catch (error) {
      throw new Error(error?.message ?? 'Parça çözümlenemedi.');
    }
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

  async summon({ guild, voiceChannel, textChannel, requestedBy }) {
    const existing = this.queues.get(guild.id);
    const previousChannelId = existing?.voiceChannelId ?? null;
    const queue = await this.ensureQueue(guild, voiceChannel, textChannel);

    queue.requestedBy = requestedBy ?? null;

    return {
      channelId: queue.voiceChannelId,
      moved: Boolean(previousChannelId && previousChannelId !== queue.voiceChannelId),
      previousChannelId
    };
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
