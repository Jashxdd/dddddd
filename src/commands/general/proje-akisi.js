import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { projectMilestones } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  category: 'Genel',
  menuGroup: 'Genel Komutlar',
  data: new SlashCommandBuilder()
    .setName('proje-akisi')
    .setDescription('Bir projenin akışını planlamaya yardımcı olacak aşamaları listeler.'),
  async execute(interaction) {
    const phases = pickRandomItems(projectMilestones, 5);

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🧭 Proje Akışı')
      .setDescription(
        phases.length
          ? phases.map((item, index) => `${index + 1}. ${item}`).join('\n')
          : 'Yeni bir proje planı hazırlamak için hedeflerini belirle.'
      )
      .setFooter({ text: 'Furmin proje rehberi' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
