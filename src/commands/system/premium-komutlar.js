import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { collectProCommands } from '../../utils/commandCatalog.js';
import { splitLinesIntoFieldChunks } from '../../utils/embedChunks.js';

export default {
  category: 'Extra',
  menuGroup: 'Pro Üyelik',
  data: new SlashCommandBuilder()
    .setName('premium-komutlar')
    .setDescription('Furmin Pro üyelerine özel komut listesini gösterir.'),
  async execute(interaction) {
    const proCommands = collectProCommands(interaction.client.commandCatalog);

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('💎 Furmin Pro Komut Kataloğu')
      .setDescription(
        proCommands.length
          ? 'Aşağıdaki liste, Pro üyelerin kullanımına açık slash ve önek komutlarını içerir.'
          : 'Şu anda pro etiketi taşıyan komut bulunmuyor. Bot sahibi yeni komutlar eklediğinde bu liste otomatik olarak güncellenecek.'
      )
      .setFooter({ text: 'Yalnızca bot sahibi tarafından verilen üyelikler pro komutlarını açar.' })
      .setTimestamp();

    if (proCommands.length) {
      const sections = new Map();
      for (const command of proCommands) {
        const key = `${command.type}_${command.category}`;
        if (!sections.has(key)) {
          sections.set(key, []);
        }

        sections.get(key).push(command);
      }

      const sortedKeys = Array.from(sections.keys()).sort((a, b) => a.localeCompare(b, 'tr'));

      for (const key of sortedKeys) {
        const commands = sections.get(key);
        if (!commands) continue;

        const [type, category] = key.split('_');
        const icon = type === 'slash' ? '⚡' : '⌨️';
        const lines = commands
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
          .map((command) => `${icon} **${command.displayName}** — ${command.description}`);

        const chunks = splitLinesIntoFieldChunks(lines);
        chunks.forEach((value, index) => {
          embed.addFields({
            name: index === 0 ? `${icon} ${category}` : '\u200B',
            value
          });
        });
      }
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
