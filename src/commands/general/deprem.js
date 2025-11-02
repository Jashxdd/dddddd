import { EmbedBuilder, SlashCommandBuilder, time } from 'discord.js';

const EARTHQUAKE_SOURCES = [
  {
    name: 'api.orhanaydogdu.com.tr',
    async fetch(limit) {
      const endpoint = `https://api.orhanaydogdu.com.tr/deprem/live.php?limit=${limit}`;
      return requestJson(endpoint);
    },
    map(data) {
      if (!Array.isArray(data?.result)) return [];
      return data.result.map((item) => ({
        location: item.title ?? item.lokasyon ?? 'Lokasyon bilinmiyor',
        magnitude: item.mag ?? item.ml ?? item.md ?? null,
        depth: item.depth ?? null,
        timestamp: normaliseTimestamp(item.timestamp ?? item.date_gmt ?? item.date),
        rawDate: item.date ?? null
      }));
    }
  },
  {
    name: 'deprem.afad.gov.tr',
    async fetch(limit) {
      const endpoint = `https://deprem.afad.gov.tr/apiv2/event/filter?limit=${limit}&orderby=desc`;
      return requestJson(endpoint);
    },
    map(data) {
      if (!Array.isArray(data?.result)) return [];
      return data.result.map((item) => ({
        location: item.title ?? item.location ?? item.place ?? 'Lokasyon bilinmiyor',
        magnitude: item.mag ?? item.magnitude ?? item.md ?? null,
        depth: item.depth ?? item.depth_km ?? item.depthKM ?? null,
        timestamp: normaliseTimestamp(item.timestamp ?? item.eventDate ?? item.date),
        rawDate: item.eventDate ?? item.date ?? null
      }));
    }
  }
];

const CACHE_TTL = 30 * 60 * 1000; // 30 dakika
let lastSuccessfulFetch = null;

function normaliseTimestamp(value) {
  if (!value) return null;
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && numeric > 10_000_000_000) {
    return Math.floor(numeric / 1000);
  }

  if (!Number.isNaN(numeric) && numeric > 0) {
    return numeric;
  }

  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    return Math.floor(parsed / 1000);
  }

  return null;
}

async function requestJson(url, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FurminBot/1.0',
        Accept: 'application/json, text/plain;q=0.8, */*;q=0.5'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return response.json();
    }

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error('Geçersiz JSON yanıtı alındı.');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Zaman aşımı');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchEarthquakes(limit = 5) {
  const errors = [];

  for (const source of EARTHQUAKE_SOURCES) {
    try {
      const payload = await source.fetch(limit);
      const mapped = source.map(payload).filter((entry) => entry.location);
      if (mapped.length) {
        const sliced = mapped.slice(0, limit);
        lastSuccessfulFetch = {
          timestamp: Date.now(),
          records: sliced,
          source: source.name
        };
        return { records: sliced, source: source.name, cached: false };
      }
      errors.push(`${source.name}: veri bulunamadı`);
    } catch (error) {
      errors.push(`${source.name}: ${error.message}`);
    }
  }

  if (lastSuccessfulFetch && Date.now() - lastSuccessfulFetch.timestamp < CACHE_TTL) {
    console.warn('Deprem verisi canlı kaynaklardan alınamadı, önbelleğe düşülüyor:', errors.join(' • '));
    return {
      records: lastSuccessfulFetch.records.slice(0, limit),
      source: `${lastSuccessfulFetch.source} (önbellek)`,
      cached: true
    };
  }

  throw new Error(errors.join(' • '));
}

function buildEarthquakeEmbed(records, sourceName, options = {}) {
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('🌍 Türkiye Son Depremler')
    .setTimestamp();

  const footerParts = [`Veri kaynağı: ${sourceName}`];
  if (options.cached) {
    footerParts.push('Önbellekten gösteriliyor');
  }
  embed.setFooter({ text: footerParts.join(' • ') });

  if (!records.length) {
    embed.setDescription('Son saatlerde bildirilen deprem bulunamadı.');
    return embed;
  }

  const lines = records.map((quake) => {
    const magnitudeValue = Number(quake.magnitude);
    const magnitude = Number.isFinite(magnitudeValue)
      ? `M${magnitudeValue.toFixed(1)}`
      : quake.magnitude
      ? `M${quake.magnitude}`
      : 'Bilinmiyor';

    const depthValue = Number(quake.depth);
    const depth = Number.isFinite(depthValue)
      ? `${depthValue.toFixed(1)} km`
      : quake.depth
      ? `${quake.depth} km`
      : 'Bilinmiyor';

    const location = quake.location ?? 'Lokasyon bilinmiyor';
    const relative = quake.timestamp ? time(quake.timestamp, 'R') : quake.rawDate ?? 'Tarih bilinmiyor';
    return `**${location}** — ${magnitude} • Derinlik: ${depth} • ${relative}`;
  });

  embed.setDescription(lines.join('\n'));
  return embed;
}

export { fetchEarthquakes, buildEarthquakeEmbed };

export default {
  category: 'Genel',
  menuGroup: 'Kullanıcı Sistemleri',
  data: new SlashCommandBuilder().setName('deprem').setDescription('Türkiye’deki son depremleri listeler.'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const { records, source, cached } = await fetchEarthquakes(5);
      const embed = buildEarthquakeEmbed(records, source, { cached });
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Deprem verisi alınamadı:', error);
      await interaction.editReply({
        content: '⚠️ Deprem verileri şu anda alınamıyor. Lütfen daha sonra tekrar dene.',
        embeds: []
      });
    }
  }
};
