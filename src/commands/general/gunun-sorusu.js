import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const questions = [
  'Bugün topluluğumuz için hangi küçük iyiliği yapabilirsin?',
  'Son zamanlarda seni en çok motive eden olay neydi?',
  'Sunucuda görmek istediğin yeni bir etkinlik var mı?',
  'Bir arkadaşını mutlu etmek için neler yaparsın?',
  'Bu hafta öğrenmek istediğin yeni şey nedir?',
  'Hangi hobi seni en çok rahatlatıyor ve neden?',
  'Ekip çalışmasında seni en çok zorlayan şey nedir?',
  'Bir süredir denemek istediğin ama fırsat bulamadığın etkinlik hangisi?',
  'Gelecekteki kendine tek bir tavsiye verebilsen ne söylerdin?',
  'Topluluğumuzda seni en çok gururlandıran an neydi?'
];

export default {
  category: 'Genel',
  menuGroup: 'Topluluk Etkileşimi',
  data: new SlashCommandBuilder()
    .setName('gunun-sorusu')
    .setDescription('Topluluk içi sohbeti başlatmak için rastgele bir soru paylaşır.'),
  async execute(interaction) {
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle('🗣️ Günün Sorusu')
      .setDescription(randomQuestion)
      .setFooter({ text: 'Düşüncelerini paylaş ve sohbeti başlat!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
