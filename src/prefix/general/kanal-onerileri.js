import { EmbedBuilder } from 'discord.js';
import { channelIdeas } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  name: 'kanal-onerileri',
  aliases: ['kanal-oneri', 'kanal'],
  category: 'Genel',
  menuGroup: 'Genel Komutlar',
  description: 'Sunucunu zenginleştirmek için kanal fikirleri önerir.',
  async execute(message) {
    const ideas = pickRandomItems(channelIdeas, 5);

    const embed = new EmbedBuilder()
      .setColor(0x16a085)
      .setTitle('📡 Kanal Önerileri')
      .setDescription(
        ideas.length
          ? ideas.map((idea) => `• ${idea}`).join('\n')
          : 'Kanal önerileri listesi yakında güncellenecek.'
      )
      .setFooter({ text: 'Furmin sunucu tasarım rehberi' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
