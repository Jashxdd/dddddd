import { buildEarthquakeEmbed, fetchEarthquakes } from '../../commands/general/deprem.js';

export default {
  name: 'quakes',
  aliases: ['deprem'],
  catalogKey: 'deprem',
  category: 'Genel',
  description: 'Son depremleri listeler.',
  menuGroup: 'Kullanıcı Sistemleri',
  async execute(message) {
    const reply = await message.reply({ content: '🌍 Deprem verileri getiriliyor...', allowedMentions: { repliedUser: false } });

    try {
      const { records, source } = await fetchEarthquakes(5);
      const embed = buildEarthquakeEmbed(records, source);
      await reply.edit({ content: '', embeds: [embed] });
    } catch (error) {
      console.error('Deprem verisi alınamadı:', error);
      await reply.edit({ content: '⚠️ Deprem verileri şu anda alınamıyor. Birazdan tekrar dene.' });
    }
  }
};
