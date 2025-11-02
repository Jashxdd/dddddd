import play from 'play-dl';

const YOUTUBE_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
  'music.youtube.com'
]);

const SPOTIFY_DOMAINS = new Set([
  'open.spotify.com',
  'play.spotify.com',
  'spotify.link'
]);

export class TrackResolutionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'TrackResolutionError';
    this.code = code;
  }
}

function isUrl(value) {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isYoutubeUrl(url) {
  return YOUTUBE_HOSTS.has(url.hostname);
}

function isSpotifyUrl(url) {
  return [...SPOTIFY_DOMAINS].some((domain) => url.hostname.endsWith(domain));
}

function isSpotifyTrackPath(pathname) {
  return pathname.split('?')[0].startsWith('/track/');
}

async function searchYoutube(query) {
  const results = await play.search(query, { limit: 1, source: { youtube: 'video' } });
  if (!results?.length) {
    return null;
  }

  const [item] = results;
  return {
    title: item.title ?? item.name ?? query,
    url: item.url,
    source: 'youtube'
  };
}

async function getYoutubeInfo(url) {
  try {
    const info = await play.video_basic_info(url);
    return {
      title: info.video_details?.title ?? url,
      url,
      source: 'youtube'
    };
  } catch (error) {
    console.warn('[Furmin][Music] YouTube bilgisi alınamadı:', error);
    return {
      title: url,
      url,
      source: 'youtube'
    };
  }
}

async function resolveSpotifyTrack(url) {
  const pathname = url.pathname;
  if (!isSpotifyTrackPath(pathname)) {
    throw new TrackResolutionError('SPOTIFY_UNSUPPORTED', 'Yalnızca Spotify şarkı bağlantıları destekleniyor.');
  }

  let trackMeta;
  try {
    trackMeta = await play.spotify(url.toString());
  } catch (error) {
    console.warn('[Furmin][Music] Spotify bilgisi alınamadı:', error);
    throw new TrackResolutionError('SPOTIFY_FETCH_FAILED', 'Spotify bağlantısı çözümlenemedi.');
  }

  if (!trackMeta || trackMeta.type !== 'track') {
    throw new TrackResolutionError('SPOTIFY_UNSUPPORTED', 'Yalnızca Spotify şarkı bağlantıları destekleniyor.');
  }

  const title = trackMeta.name;
  const artists = Array.isArray(trackMeta.artists)
    ? trackMeta.artists.map((artist) => artist.name).join(' ')
    : '';
  const searchTerm = [title, artists].filter(Boolean).join(' ');

  const youtubeMatch = await searchYoutube(searchTerm);
  if (!youtubeMatch) {
    throw new TrackResolutionError('NO_RESULTS', 'Bu şarkı için uygun bir sonuç bulunamadı.');
  }

  return {
    ...youtubeMatch,
    requestedTitle: title,
    requestedArtists: artists,
    source: 'spotify'
  };
}

export async function resolveTrack(query) {
  const trimmed = query?.trim();
  if (!trimmed) {
    throw new TrackResolutionError('EMPTY_QUERY', 'Geçerli bir şarkı ismi veya bağlantısı gir.');
  }

  if (isUrl(trimmed)) {
    const url = new URL(trimmed);

    if (isYoutubeUrl(url)) {
      return getYoutubeInfo(url.toString());
    }

    if (isSpotifyUrl(url)) {
      return resolveSpotifyTrack(url);
    }

    throw new TrackResolutionError('UNSUPPORTED_URL', 'Yalnızca YouTube veya Spotify şarkı bağlantıları destekleniyor.');
  }

  const youtubeMatch = await searchYoutube(trimmed);
  if (!youtubeMatch) {
    throw new TrackResolutionError('NO_RESULTS', 'Hiç sonuç bulunamadı, farklı bir arama yapmayı dene.');
  }

  return youtubeMatch;
}
