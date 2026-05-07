import { EmbedBuilder } from 'discord.js';
import { proQuickActions } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  name: 'pro-hizli-eylem',
  aliases: ['prohizli', 'phizli'],
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  description: 'Pro yöneticiler için günün hızlı eylem önerilerini sunar.',
  async execute(message) {
    const items = pickRandomItems(proQuickActions, 5);

    const embed = new EmbedBuilder()
      .setColor(0x0984e3)
      .setTitle('⚡ Pro Hızlı Eylemler')
      .setDescription(items.map((item) => `• ${item}`).join('\n'))
      .setFooter({ text: 'Furmin Pro görev paneli' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
