import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const riddles = [
  { question: 'Yürürken iz bırakır, durunca yok olur. Nedir?', answer: 'Ayak izleri' },
  { question: 'Düşer ama yere değmez. Nedir?', answer: 'Akşam karanlığı' },
  { question: 'Ne kadar alırsan o kadar büyür. Nedir?', answer: 'Çukur' },
  { question: 'Geceleri doğar, sabahları ölür. Nedir?', answer: 'Rüya' }
];

export default {
  category: 'Eğlence',
  data: new SlashCommandBuilder().setName('bilmece').setDescription('Rastgele bir bilmece sorar.'),
  async execute(interaction) {
    const selected = riddles[Math.floor(Math.random() * riddles.length)];
    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🧠 Bilmece Zamanı')
      .setDescription(selected.question)
      .addFields({ name: 'Cevap', value: `||${selected.answer}||` })
      .setFooter({ text: 'Cevabı görmek için spoiler alanına tıkla.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
