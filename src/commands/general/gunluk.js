import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const tavsiyeler = [
  'Kanallarınızı düzenli olarak gözden geçirin ve ihtiyaç duymadığınız rolleri kaldırın.',
  "Otomatik moderasyonu etkin tutarak Furmin'in sizi desteklemesine izin verin.",
  'Sunucu kurallarını sık sık hatırlatın; `/kurallar` komutunu öne çıkarın.',
  'Yeni üyeler için karşılayıcı mesajlar hazırlayın ve mod-log kanalını takip edin.',
  'Pro komutlarını denemek için yetkililerle iletişime geçmeyi unutmayın.',
  'Kanal açıklamalarını güncel tutarak üyelerinize rehberlik edin.',
  'Eğlence komutlarıyla sohbeti canlandırın; `/espri` ve `/zar` her zaman hazır.',
  'Günlük raporlar için `/sistem-ozeti` komutunu kullanarak ayarları kontrol edin.'
];

function rastgeleTavsiye() {
  return tavsiyeler[Math.floor(Math.random() * tavsiyeler.length)];
}

export default {
  category: 'Genel',
  menuGroup: 'Kullanıcı Sistemleri',
  data: new SlashCommandBuilder().setName('gunluk').setDescription('Sunucuyu geliştirmek için günlük Furmin tavsiyesi verir.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle('🗓️ Günlük Furmin Tavsiyesi')
      .setDescription(rastgeleTavsiye())
      .setFooter({ text: 'Yeni bir tavsiye almak için komutu tekrar çalıştırabilirsin.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
