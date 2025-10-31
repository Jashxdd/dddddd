import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { collectProCommands } from '../../utils/commandCatalog.js';
import { listProMembers } from '../../utils/proMembership.js';

function buildCommandSummary(commands) {
  if (!commands.length) {
    return 'Şu anda pro etiketli komut bulunmuyor.';
  }

  const grouped = new Map();
  for (const command of commands) {
    if (!grouped.has(command.category)) {
      grouped.set(command.category, { count: 0, slash: 0, prefix: 0 });
    }
    const bucket = grouped.get(command.category);
    bucket.count += 1;
    if (command.slash) bucket.slash += 1;
    if (command.prefix) bucket.prefix += 1;
  }

  return Array.from(grouped.entries())
    .map(([category, stats]) =>
      `• **${category}** — ${stats.count} komut (⚡ ${stats.slash} • ⌨️ ${stats.prefix})`
    )
    .join('\n');
}

export default {
  category: 'Extra',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  data: new SlashCommandBuilder()
    .setName('pro-rapor')
    .setDescription('Pro üyelik durumunu, komut özetini ve son eklemeleri listeler.'),
  async execute(interaction) {
    const [commands, members] = await Promise.all([
      Promise.resolve(collectProCommands(interaction.client.commandCatalog)),
      listProMembers()
    ]);

    const latestCommands = commands.slice(-5);
    const summaryLines = latestCommands.map((command) => {
      const forms = [];
      if (command.slash) forms.push(`⚡ /${command.slash.name}`);
      if (command.prefix) forms.push(`⌨️ ${command.prefix.display}`);
      return `${forms.join(' • ') || 'Komut'} — ${command.category}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('💎 Furmin Pro Durum Raporu')
      .setDescription('Pro üyelik verileri ve komut katmanı aşağıda özetlendi.')
      .addFields(
        { name: 'Pro Üye Sayısı', value: `${members.length}`, inline: true },
        { name: 'Pro Komut Sayısı', value: `${commands.length}`, inline: true },
        { name: 'Son Güncelleme', value: new Date().toLocaleString('tr-TR'), inline: true }
      )
      .addFields(
        { name: 'Kategori Özeti', value: buildCommandSummary(commands) }
      )
      .setFooter({ text: 'Bu rapor yalnızca Pro üyeler tarafından görülebilir.' })
      .setTimestamp();

    if (summaryLines.length) {
      embed.addFields({
        name: 'Yeni Eklenenler',
        value: summaryLines.join('\n')
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
