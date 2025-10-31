import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';
import { listProMembers } from '../../utils/proMembership.js';
import { collectProCommands } from '../../utils/commandCatalog.js';

export default {
  name: 'premium',
  aliases: ['pro'],
  category: 'Extra',
  description: 'Furmin Pro avantajlarını listeler ve başvuru bilgisi verir.',
  menuGroup: 'Pro Üyelik',
  async execute(message) {
    const proMembers = await listProMembers();
    const isPro = proMembers.includes(message.author.id);
    const proCommands = collectProCommands(message.client.commandCatalog);

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

    if (proCommands.length) {
      const preview = proCommands
        .slice(0, 6)
        .map((command) => `${command.type === 'slash' ? '⚡' : '⌨️'} ${command.displayName}`)
        .join('\n');

      embed.addFields({
        name: 'Pro Komutları',
        value:
          preview +
          (proCommands.length > 6
            ? `\n... ve ${proCommands.length - 6} komut daha. Ayrıntılar için \`/premium-komutlar\` yaz.`
            : '')
      });
    }

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
