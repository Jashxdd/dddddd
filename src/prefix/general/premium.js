import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';
import { listProMembers } from '../../utils/proMembership.js';

export default {
  name: 'premium',
  aliases: ['pro'],
  category: 'Extra',
  description: 'Furmin Pro avantajlarını listeler ve başvuru bilgisi verir.',
  menuGroup: 'Pro Üyelik',
  async execute(message) {
    const proMembers = await listProMembers();
    const isPro = proMembers.includes(message.author.id);

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('💎 Furmin Pro Üyeliği')
      .setDescription(
        isPro
          ? 'Pro üyesisin! Yardım menüsünde 💎 simgeli komutların tamamını kullanabilirsin.'
          : 'Pro üyelik, gelişmiş log raporları ve eğlence paketine erişim sağlar. Yetkiliyle iletişime geçerek talep oluştur.'
      )
      .addFields({ name: 'Pro Üye Sayısı', value: `${proMembers.length}` })
      .setFooter({ text: 'Slash: /premium — detaylı bilgi ve düğmeler içerir.' })
      .setTimestamp();

    const row = new ActionRowBuilder();
    if (config.proInfoUrl) {
      row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Pro Bilgi').setURL(config.proInfoUrl));
    }
    if (config.supportServerUrl) {
      row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Destek Sunucusu').setURL(config.supportServerUrl));
    }

    await message.reply({ embeds: [embed], components: row.components.length ? [row] : [], allowedMentions: { repliedUser: false } });
  }
};
