import { EmbedBuilder } from 'discord.js';
import { eventIdeas } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  name: 'oyun-oner',
  aliases: ['oyunoner', 'mini-oyun'],
  category: 'Eğlence',
  menuGroup: 'Mini Oyunlar',
  description: 'Sunucuda deneyebileceğin eğlenceli etkinlik ve mini oyunları önerir.',
  async execute(message) {
    const suggestions = pickRandomItems(eventIdeas, 4);

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🎮 Mini Oyun Önerileri')
      .setDescription(
        suggestions.length
          ? suggestions.map((idea, index) => `${index + 1}. ${idea}`).join('\n')
          : 'Yeni öneriler hazırlanıyor. Birazdan tekrar dene!'
      )
      .setFooter({ text: 'Furmin eğlence kataloğu' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
