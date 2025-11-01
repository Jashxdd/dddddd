import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const fallbackImages = [
  'https://cdn2.thecatapi.com/images/8pc.jpg',
  'https://cdn2.thecatapi.com/images/6qi.jpg',
  'https://cdn2.thecatapi.com/images/2oo.gif',
  'https://cataas.com/cat/says/merhaba?width=400&height=250',
  'https://cdn2.thecatapi.com/images/MTY3ODIyMQ.jpg',
  'https://cdn2.thecatapi.com/images/4li.jpg',
  'https://cdn2.thecatapi.com/images/9j5.jpg'
];

async function fetchCatImage() {
  try {
    const response = await fetch('https://api.thecatapi.com/v1/images/search?size=med&mime_types=jpg,png,gif');
    if (!response.ok) {
      throw new Error(`Geçersiz yanıt: ${response.status}`);
    }

    const data = await response.json();
    const url = data?.[0]?.url;

    if (typeof url === 'string' && url.startsWith('http')) {
      return url;
    }

    throw new Error('Boş kedi görseli yanıtı alındı.');
  } catch (error) {
    console.warn('Kedi görseli alınamadı, yedek liste kullanılacak:', error);
    const index = Math.floor(Math.random() * fallbackImages.length);
    return fallbackImages[index];
  }
}

export default {
  category: 'Eğlence',
  data: new SlashCommandBuilder().setName('kedi').setDescription('Rastgele bir kedi fotoğrafı gönderir.'),
  async execute(interaction) {
    const image = await fetchCatImage();

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🐾 Miyav!')
      .setDescription('Gününüzü güzelleştirecek bir kedi burada!')
      .setImage(image)
      .setFooter({ text: 'Kediler stres azaltır, unutmayın.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
