import play from 'play-dl';

const YT_SEARCH_OPTIONS = { limit: 1, source: { youtube: 'video' } };

function isUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
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
  return /(youtube\.com|youtu\.be)/i.test(url);
}

async function searchYoutube(term) {
  const results = await play.search(term, YT_SEARCH_OPTIONS).catch(() => []);
  if (!results?.length) return null;
  const [first] = results;
  const url = first?.url?.trim();
  if (!url) return null;
  return { url, title: first.title ?? first.name ?? term };
}

async function resolveSpotifyTrack(url) {
  if (isSpotifyCollection(url)) {
    const error = new Error('SPOTIFY_LIST_UNSUPPORTED');
    error.code = 'SPOTIFY_LIST_UNSUPPORTED';
    throw error;
  }

  let meta = null;
  try {
    meta = await play.spotify(url).catch(() => null);
  } catch {
    meta = null;
  }

  if (!meta || meta.type !== 'track') {
    const error = new Error('SPOTIFY_META_FAIL');
    error.code = 'SPOTIFY_META_FAIL';
    throw error;
  }

  const title = meta.name ?? '';
  const artists = Array.isArray(meta.artists)
    ? meta.artists.map((artist) => artist.name).filter(Boolean).join(' ')
    : '';
  const searchKey = [title, artists].filter(Boolean).join(' ').trim();

  if (!searchKey) {
    const error = new Error('SPOTIFY_META_FAIL');
    error.code = 'SPOTIFY_META_FAIL';
    throw error;
  }

  const youtubeMatch = await searchYoutube(searchKey);
  if (!youtubeMatch) {
    const error = new Error('YT_NOT_FOUND_FROM_SPOTIFY');
    error.code = 'YT_NOT_FOUND_FROM_SPOTIFY';
    throw error;
  }

  return {
    url: youtubeMatch.url,
    title: youtubeMatch.title,
    requestedTitle: title,
    requestedArtists: artists,
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

    return { url: trimmed, title: null, source: 'youtube' };
  }

  const youtubeMatch = await searchYoutube(trimmed);
  if (!youtubeMatch) {
    const error = new Error('YT_NOT_FOUND');
    error.code = 'YT_NOT_FOUND';
    throw error;
  }

  return { url: youtubeMatch.url, title: youtubeMatch.title, source: 'youtube' };
}
