import { EmbedBuilder } from 'discord.js';
import { eventIdeas } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  name: 'etkinlik-takvimi',
  aliases: ['etkinlik', 'takvim'],
  category: 'Genel',
  menuGroup: 'Genel Komutlar',
  description: 'Topluluk için düzenleyebileceğin etkinlik fikirlerini sıralar.',
  async execute(message) {
    const ideas = pickRandomItems(eventIdeas, 5);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('📅 Etkinlik Takvimi Fikirleri')
      .setDescription(
        ideas.length
          ? ideas.map((idea, index) => `${index + 1}. ${idea}`).join('\n')
          : 'Yeni etkinlik fikirleri yakında eklenecek.'
      )
      .setFooter({ text: 'Furmin etkinlik planlayıcısı' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
