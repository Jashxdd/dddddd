import { EmbedBuilder } from 'discord.js';
import { collectProCommands } from '../../utils/commandCatalog.js';

export default {
  name: 'prokomutlar',
  aliases: ['prolistesi', 'pro-komutlar'],
  catalogKey: 'premium-komutlar',
  category: 'Extra',
  description: 'Pro üyelerin erişebildiği komutların özetini gösterir.',
  menuGroup: 'Pro Üyelik',
  async execute(message) {
    const proCommands = collectProCommands(message.client.commandCatalog);

    if (!proCommands.length) {
      await message.reply({
        content: '💤 Pro etiketi taşıyan komut bulunmuyor.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('Furmin Pro Komutları')
      .setDescription('Slash menüsünde `/premium-komutlar` yazarak etkileşimli listeyi açabilirsin.')
      .setFooter({ text: 'Pro üyelik, bot sahibi tarafından verilir.' })
      .setTimestamp();

    const summary = proCommands
      .slice(0, 15)
      .map((command) => {
        const forms = [];
        if (command.slash) {
          forms.push(`⚡ /${command.slash.name}`);
        }
        if (command.prefix) {
          forms.push(`⌨️ ${command.prefix.display}`);
        }
        const badge = command.ownerOnly ? ' ⭐' : '';
        return `${forms.join(' • ') || 'Komut'}${badge}`;
      })
      .join('\n');

    embed.addFields({
      name: 'Komutlar',
      value:
        summary +
        (proCommands.length > 15
          ? `\n... ve ${proCommands.length - 15} komut daha. Tümü için \`/premium-komutlar\` yaz.`
          : '')
    });

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
