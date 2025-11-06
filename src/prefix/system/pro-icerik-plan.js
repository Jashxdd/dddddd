import { EmbedBuilder } from 'discord.js';
import { proContentPlans } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  name: 'pro-icerik-plan',
  aliases: ['proicerik', 'picerik'],
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  description: 'Pro üyeler için içerik ve görev planı önerileri sunar.',
  async execute(message) {
    const items = pickRandomItems(proContentPlans, 5);

    const embed = new EmbedBuilder()
      .setColor(0x74b9ff)
      .setTitle('🗓️ Pro İçerik Planı')
      .setDescription(items.map((item) => `• ${item}`).join('\n'))
      .setFooter({ text: 'Furmin Pro içerik koçu' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
