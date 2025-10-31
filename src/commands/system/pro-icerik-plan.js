import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { proContentPlans } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  data: new SlashCommandBuilder()
    .setName('pro-icerik-plan')
    .setDescription('Pro üyeler için içerik ve görev planı önerileri sunar.'),
  async execute(interaction) {
    const items = pickRandomItems(proContentPlans, 5);

    const embed = new EmbedBuilder()
      .setColor(0x74b9ff)
      .setTitle('🗓️ Pro İçerik Planı')
      .setDescription(items.map((item) => `• ${item}`).join('\n'))
      .setFooter({ text: 'Furmin Pro içerik koçu' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
