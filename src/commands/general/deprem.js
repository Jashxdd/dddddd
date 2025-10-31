import { EmbedBuilder, SlashCommandBuilder, time } from 'discord.js';

async function fetchEarthquakes(limit = 5) {
  const endpoint = `https://api.orhanaydogdu.com.tr/deprem/live.php?limit=${limit}`;
  const response = await fetch(endpoint, { headers: { 'User-Agent': 'MarpelBot/1.0' } });
  if (!response.ok) {
    throw new Error(`Deprem verisi alınamadı: ${response.status}`);
  }
  const data = await response.json();
  return data?.result ?? [];
}

function buildEarthquakeEmbed(results) {
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('🌍 Türkiye Son Depremler')
    .setFooter({ text: 'Veri kaynağı: api.orhanaydogdu.com.tr' })
    .setTimestamp();

  if (!results.length) {
    embed.setDescription('Son saatlerde bildirilen deprem bulunamadı.');
    return embed;
  }

  const lines = results.map((quake) => {
    const magnitude = quake.mag || quake.ml || quake.md || 'Bilinmiyor';
    const depth = quake.depth ? `${quake.depth} km` : 'Bilinmiyor';
    const location = quake.title ?? quake.lokasyon ?? 'Lokasyon bilinmiyor';
    const date = quake.date && quake.timestamp ? time(Math.floor(Number(quake.timestamp) / 1000), 'R') : quake.date;
    return `**${location}** — M${magnitude} • Derinlik: ${depth} • ${date}`;
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
      const results = await fetchEarthquakes(5);
      const embed = buildEarthquakeEmbed(results);
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
