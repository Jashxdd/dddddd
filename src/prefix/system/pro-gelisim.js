import { EmbedBuilder } from 'discord.js';
import { proGrowthIdeas } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  name: 'pro-gelisim',
  aliases: ['progelisim', 'pgelisim'],
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  description: 'Topluluğu büyütmek için Pro gelişim fikirleri sunar.',
  async execute(message) {
    const ideas = pickRandomItems(proGrowthIdeas, 5);

    const embed = new EmbedBuilder()
      .setColor(0xff7675)
      .setTitle('🌱 Pro Gelişim Fikirleri')
      .setDescription(ideas.map((idea) => `• ${idea}`).join('\n'))
      .setFooter({ text: 'Furmin Pro büyüme rehberi' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
