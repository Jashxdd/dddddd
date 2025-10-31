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
        if (!sections.has(command.category)) {
          sections.set(command.category, []);
        }

        sections.get(command.category).push(command);
      }

      const sortedCategories = Array.from(sections.keys()).sort((a, b) => a.localeCompare(b, 'tr'));

      for (const category of sortedCategories) {
        const commands = sections.get(category);
        if (!commands) continue;

        const lines = commands
          .slice()
          .sort((a, b) => {
            const aName = a.slash?.name ?? a.prefix?.name ?? 'zzz';
            const bName = b.slash?.name ?? b.prefix?.name ?? 'zzz';
            return aName.localeCompare(bName, 'tr');
          })
          .map((command) => {
            const forms = [];
            if (command.slash) {
              forms.push(`⚡ \`/${command.slash.name}\``);
            }
            if (command.prefix) {
              forms.push(`⌨️ \`${command.prefix.display}\``);
            }
            const label = forms.length ? forms.join(' • ') : 'Komut';
            const badges = `${command.ownerOnly ? ' ⭐' : ''}`;
            return `${label}${badges} — ${command.description}`;
          });

        const chunks = splitLinesIntoFieldChunks(lines);
        chunks.forEach((value, index) => {
          embed.addFields({
            name: index === 0 ? `📂 ${category}` : '\u200B',
            value
          });
        });
      }
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
