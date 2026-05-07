import { EmbedBuilder } from 'discord.js';
import { resourceHighlights } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

function formatResource({ emoji, name, description }) {
  const icon = emoji ?? '📁';
  return `${icon} **${name}** — ${description}`;
}

export default {
  name: 'kaynak-arsivi',
  aliases: ['kaynaklar', 'arsiv'],
  category: 'Genel',
  menuGroup: 'Genel Komutlar',
  description: 'Furmin rehberlerinden seçilmiş kaynak önerileri sunar.',
  async execute(message) {
    const items = pickRandomItems(resourceHighlights, 5);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('📚 Kaynak Arşivi')
      .setDescription(
        items.length
          ? items.map((resource) => formatResource(resource)).join('\n')
          : 'Kaynak havuzu yakında güncellenecek.'
      )
      .setFooter({ text: 'Furmin bilgi merkezi' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
