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

  const auth = play.authorization;
  const hasSpotifyCredentials =
    auth && typeof auth === 'object' && (auth.access_token || auth.client_id || auth.refresh_token);

  if (!hasSpotifyCredentials) {
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
    console.warn('Akış oturumu yenilenirken beklenmeyen bir durum oluştu:', error);
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
      author: details?.channel?.name ?? details?.author?.name ?? 'Bilinmeyen Kanal',
      rawInfo: info
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
        author: details?.channel?.name ?? details?.author?.name ?? 'Bilinmeyen Kanal',
        rawInfo: basic
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

async function resolveYoutubeSearch(searchTerm, fallbackTitle) {
  let results;
  try {
    results = await play.search(searchTerm, { limit: 1, source: { youtube: 'video' } });
  } catch (error) {
    console.warn('YouTube araması başarısız oldu:', error);
    throw new Error('YouTube araması başarısız oldu. Lütfen farklı bir sorgu deneyin.');
  }
  if (!results.length) {
    throw new Error('Parça bulunamadı. Farklı bir arama deneyin.');
  }

  const chosen = results[0];
  const info = await fetchYoutubeInfo(chosen.url, fallbackTitle);
  return {
    ...info,
    source: 'youtube-search',
    fallbackSearchTerm: searchTerm
  };
}

async function resolveYoutubePlaylist(url) {
  await ensurePlaySession();

  let playlist;
  try {
    playlist = await play.playlist_info(url, { incomplete: true });
  } catch (error) {
    console.warn('YouTube çalma listesi çözümlenemedi:', error);
    throw new Error('YouTube çalma listesi çözümlenemedi. Farklı bir bağlantı deneyin.');
  }

  let videos = Array.isArray(playlist?.videos) ? playlist.videos : [];

  if (!videos.length && typeof playlist?.all_videos === 'function') {
    try {
      videos = await playlist.all_videos();
    } catch (error) {
      console.warn('YouTube çalma listesi videoları alınamadı:', error);
    }
  }

  const firstVideo = videos[0];

  if (!firstVideo) {
    throw new Error('YouTube çalma listesinde oynatılabilir parça bulunamadı.');
  }

  const videoUrl = firstVideo.url ?? (firstVideo.id ? `https://www.youtube.com/watch?v=${firstVideo.id}` : null);
  if (!videoUrl) {
    throw new Error('YouTube çalma listesindeki ilk parçanın bağlantısı bulunamadı.');
  }

  const info = await fetchYoutubeInfo(videoUrl, firstVideo.title ?? playlist?.title);
  return {
    ...info,
    source: 'youtube-playlist',
    playlist: {
      name: playlist?.title ?? 'YouTube Çalma Listesi',
      url: playlist?.url ?? url
    },
    fallbackSearchTerm: info.title,
    originalQuery: url
  };
}

async function resolveTrack(query) {
  await ensurePlaySession();

  const validation = typeof play.validate === 'function' ? play.validate(query) : play.yt_validate(query);

  if (validation === 'yt_video' || validation === 'video') {
    const info = await fetchYoutubeInfo(query);
    return {
      ...info,
      source: 'youtube',
      fallbackSearchTerm: info.title,
      originalQuery: query
    };
  }

  if (validation === 'yt_playlist' || validation === 'playlist') {
    return resolveYoutubePlaylist(query);
  }

  if (validation === 'sp_track' || validation === 'sp_playlist' || validation === 'sp_album') {
    throw new Error('Spotify bağlantıları desteklenmiyor. Lütfen YouTube bağlantısı gir ya da şarkı adını yaz.');
  }

  const resolved = await resolveYoutubeSearch(query, query);
  return {
    ...resolved,
    originalQuery: query
  };
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

async function createResourceFromUrl(url) {
  await ensurePlaySession();
  const stream = await play.stream(url, { discordPlayerCompatibility: true, quality: 2 });
  return createAudioResource(stream.stream, { inputType: stream.type, inlineVolume: true });
}

async function createResourceFromInfo(info) {
  await ensurePlaySession();
  if (typeof play.stream_from_info !== 'function') {
    const targetUrl = info?.video_details?.url ?? info?.videoDetails?.url ?? info?.url ?? null;
    if (!targetUrl) {
      throw new Error('Video bilgisi akış oluşturmak için yeterli değil.');
    }
    return createResourceFromUrl(targetUrl);
  }

  const stream = await play.stream_from_info(info, { discordPlayerCompatibility: true, quality: 2 });
  return createAudioResource(stream.stream, { inputType: stream.type, inlineVolume: true });
}

async function createResource(track, depth = 0) {
  try {
    const resource = await createResourceFromUrl(track.url);
    return { resource, track };
  } catch (primaryError) {
    console.warn('Doğrudan akış başlatılamadı, ayrıntılı bilgi deneniyor...', primaryError);

    try {
      const info = track.rawInfo ?? (await play.video_info(track.url));
      const resource = await createResourceFromInfo(info);
      const details = info?.video_details ?? info?.videoDetails ?? {};
      const enrichedTrack = {
        ...track,
        title: safeTitle(details.title ?? track.title),
        durationInSec:
          Number.parseInt(details.durationInSec ?? details.lengthSeconds ?? `${track.durationInSec ?? 0}`, 10) ||
          track.durationInSec ||
          0,
        author: details?.channel?.name ?? details?.author?.name ?? track.author ?? 'Bilinmeyen Kanal',
        rawInfo: info
      };
      return { resource, track: enrichedTrack };
    } catch (infoError) {
      console.warn('Video bilgisi üzerinden akış oluşturulamadı.', infoError);

      if (!track._fallbackTried && track.fallbackSearchTerm && depth === 0) {
        console.warn('Alternatif arama sonucu deneniyor:', track.fallbackSearchTerm);
        const fallback = await resolveYoutubeSearch(track.fallbackSearchTerm, track.title ?? track.fallbackSearchTerm);
        return createResource({
          ...track,
          ...fallback,
          _fallbackTried: true
        }, depth + 1);
      }

      const message = infoError?.message ?? primaryError?.message ?? 'Akış başlatılırken beklenmeyen bir hata oluştu.';
      throw new Error(message);
    }
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

    let resourceResult;
    try {
      resourceResult = await createResource(track);
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
    queue.player.play(resourceResult.resource);
    const resolvedTrack = resourceResult.track;
    queue.tracks[0] = resolvedTrack;
    queue.current = resolvedTrack;
    queue.requestedBy = resolvedTrack.requestedBy;
    return resolvedTrack;
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
    const normalizedQuery = typeof query === 'string' ? query.trim() : '';

    if (!normalizedQuery) {
      throw new Error('Lütfen geçerli bir bağlantı veya arama terimi belirtin.');
    }

    let track;
    try {
      track = await resolveTrack(normalizedQuery);
    } catch (error) {
      throw new Error(error?.message ?? 'Parça çözümlenemedi.');
    }

    if (!track?.url) {
      throw new Error('Parça bağlantısı doğrulanamadı. Lütfen farklı bir şarkı deneyin.');
    }

    try {
      // URL'i doğrulayıp play-dl'ye geçersiz değer gitmesini engeller.
      // new URL, geçerli protokollere sahip olmayan değerlerde hata fırlatır.
      const validatedUrl = new URL(track.url);
      track = { ...track, url: validatedUrl.toString() };
    } catch (error) {
      throw new Error('Parça bağlantısı doğrulanamadı. Lütfen farklı bir şarkı deneyin.');
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
