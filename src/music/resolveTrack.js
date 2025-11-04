import play from 'play-dl';

const YT_VIDEO_SOURCE = { youtube: 'video' };

function isUrl(value) {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
}

function isSpotifyTrack(url) {
  return /open\.spotify\.com\/track\//i.test(url);
}

function isSpotifyCollection(url) {
  return /open\.spotify\.com\/(playlist|album)\//i.test(url);
}

function isYoutubeUrl(url) {
  return /(youtube\.com|youtu\.be)\//i.test(url);
}

async function searchYouTube(query) {
  const results = await play.search(query, { limit: 1, source: YT_VIDEO_SOURCE });
  if (!Array.isArray(results) || !results.length) {
    const error = new Error('YT_NOT_FOUND');
    error.code = 'YT_NOT_FOUND';
    throw error;
  }

  const first = results[0];
  const url = first?.url?.trim();
  if (!url) {
    const error = new Error('YT_NOT_FOUND');
    error.code = 'YT_NOT_FOUND';
    throw error;
  }

  return {
    url,
    title: first?.title ?? query,
    author: first?.channel?.name ?? null,
    durationInSec: typeof first?.durationInSec === 'number' ? first.durationInSec : null,
    source: 'youtube'
  };
}

async function resolveSpotifyTrack(url) {
  if (isSpotifyCollection(url)) {
    const error = new Error('SPOTIFY_LIST_UNSUPPORTED');
    error.code = 'SPOTIFY_LIST_UNSUPPORTED';
    throw error;
  }

  if (!isSpotifyTrack(url)) {
    const error = new Error('UNSUPPORTED_URL');
    error.code = 'UNSUPPORTED_URL';
    throw error;
  }

  let spotifyData = null;
  try {
    spotifyData = await play.spotify(url);
  } catch (error) {
    console.warn('[Furmin][Music] Spotify bilgisi alınamadı:', error);
  }

  const searchKey = [spotifyData?.name, spotifyData?.artists?.[0]?.name]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (!searchKey) {
    const error = new Error('SPOTIFY_META_FAIL');
    error.code = 'SPOTIFY_META_FAIL';
    throw error;
  }

  const resolved = await searchYouTube(searchKey);
  return {
    ...resolved,
    requestedTitle: spotifyData?.name ?? resolved.title,
    requestedArtist: spotifyData?.artists?.[0]?.name ?? null,
    source: 'spotify'
  };
}

export async function resolveTrack(query) {
  const trimmed = query?.trim();
  if (!trimmed) {
    const error = new Error('QUERY_EMPTY');
    error.code = 'QUERY_EMPTY';
    throw error;
  }

  if (isUrl(trimmed)) {
    if (isSpotifyCollection(trimmed)) {
      const error = new Error('SPOTIFY_LIST_UNSUPPORTED');
      error.code = 'SPOTIFY_LIST_UNSUPPORTED';
      throw error;
    }

    if (isSpotifyTrack(trimmed)) {
      return resolveSpotifyTrack(trimmed);
    }

    if (!isYoutubeUrl(trimmed)) {
      const error = new Error('UNSUPPORTED_URL');
      error.code = 'UNSUPPORTED_URL';
      throw error;
    }

    return {
      url: trimmed,
      title: null,
      source: 'youtube'
    };
  }

  return searchYouTube(trimmed);
}
