import { EmbedBuilder } from 'discord.js';
import { channelIdeas, communityInspirations } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  name: 'etkinlik-fikir',
  aliases: ['etkinlikfikir', 'etkinlik-fikri'],
  category: 'Eğlence',
  menuGroup: 'Etkinlik Planları',
  description: 'Sunucunda deneyebileceğin topluluk etkinliği fikirlerini listeler.',
  async execute(message) {
    const ideas = pickRandomItems(channelIdeas, 3);
    const inspirations = pickRandomItems(communityInspirations, 2);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🎉 Etkinlik Fikirleri')
      .setDescription(
        ideas.length
          ? ideas.map((idea, index) => `${index + 1}. ${idea}`).join('\n')
          : 'Yeni fikirler hazırlanıyor, lütfen biraz sonra tekrar dene.'
      )
      .addFields({
        name: 'Topluluk İlhamları',
        value:
          inspirations.length
            ? inspirations.join('\n')
            : 'İlham notları kısa sürede eklenecek.'
      })
      .setFooter({ text: 'Furmin etkinlik kitaplığı' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
