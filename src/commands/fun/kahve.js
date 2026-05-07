import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const kahveler = [
  { ad: 'Türk Kahvesi', aciklama: 'Yoğun kıvamlı, köpüğü bol klasik lezzet.' },
  { ad: 'Latte', aciklama: 'Sütlü ve yumuşak içimiyle sohbetlere eşlik eder.' },
  { ad: 'Mocha', aciklama: 'Çikolata dokunuşuyla tatlı bir mola.' },
  { ad: 'Espresso', aciklama: 'Hızlı bir enerji için kısa ve sert yudum.' },
  { ad: 'Filtre Kahve', aciklama: 'Uzun sohbetlerin vazgeçilmez eşlikçisi.' },
  { ad: 'Frappe', aciklama: 'Serinlemek istediğinde buzlu kahve keyfi.' },
  { ad: 'Flat White', aciklama: 'Dengeli süt köpüğüyle rafine bir seçenek.' },
  { ad: 'Affogato', aciklama: 'Dondurma üzerinde espresso; tatlı ve kahve bir arada.' }
];

function rastgeleKahve() {
  return kahveler[Math.floor(Math.random() * kahveler.length)];
}

export default {
  category: 'Eğlence',
  data: new SlashCommandBuilder().setName('kahve').setDescription('Sana rastgele bir kahve önerisi gönderir.'),
  async execute(interaction) {
    const kahve = rastgeleKahve();
    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('☕ Kahve Molası')
      .setDescription(`Bugünkü öneri: **${kahve.ad}**`)
      .addFields({ name: 'Neden seçmelisin?', value: kahve.aciklama })
      .setFooter({ text: 'İkinci bir fincan için komutu tekrar çalıştır.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
