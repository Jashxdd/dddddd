import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const images = [
  'https://cataas.com/cat/says/merhaba?width=400&height=250',
  'https://cdn2.thecatapi.com/images/MTY3ODIyMQ.jpg',
  'https://cdn2.thecatapi.com/images/4li.jpg',
  'https://cdn2.thecatapi.com/images/9j5.jpg'
];

export default {
  category: 'Eğlence',
  data: new SlashCommandBuilder().setName('kedi').setDescription('Rastgele bir kedi fotoğrafı gönderir.'),
  async execute(interaction) {
    const image = images[Math.floor(Math.random() * images.length)];

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
