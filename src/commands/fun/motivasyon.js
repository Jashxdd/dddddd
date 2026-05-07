import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const quotes = [
  'Başarı, küçük çabaların her gün tekrar edilmesidir. — Robert Collier',
  'Başlamak için mükemmel olman gerekmiyor; mükemmel olmak için başlamak gerekiyor. — Zig Ziglar',
  'Bugün yapacağın şeyler yarınını şekillendirir.',
  'Her gün yeni bir başlangıçtır. Derin nefes al ve yeniden dene.',
  'İmkansız sadece zaman alan şeyler için kullanılan bir kelimedir.'
];

export default {
  category: 'Eğlence',
  data: new SlashCommandBuilder().setName('motivasyon').setDescription('Gününüzü güzelleştirecek bir motivasyon sözü gönderir.'),
  async execute(interaction) {
    const quote = quotes[Math.floor(Math.random() * quotes.length)];

    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle('✨ Motivasyon Köşesi')
      .setDescription(quote)
      .setFooter({ text: 'Kendine inan, gerisi gelir.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
