import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getGuildWarningEntries } from '../../utils/warnStorage.js';

export function buildWarningLeaderboard({ guild, entries }) {
  const embed = new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle('💎 Uyarı Liderlik Tablosu')
    .setDescription('En fazla uyarıya sahip üyeler burada listelenir.')
    .setFooter({ text: guild?.name ?? 'Furmin Pro' })
    .setTimestamp();

  if (!entries.length) {
    embed.addFields({ name: 'Temiz!', value: 'Bu sunucuda kayıtlı uyarı bulunmuyor. Harika!' });
    return embed;
  }

  const lines = entries.slice(0, 10).map((entry, index) => {
    const position = index + 1;
    const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `#${position}`;
    return `${medal} <@${entry.userId}> — **${entry.count}** uyarı`;
  });

  embed.addFields({ name: 'Sıralama', value: lines.join('\n') });
  return embed;
}

export default {
  category: 'Extra',
  menuGroup: 'Pro Üyelik',
  proOnly: true,
  data: new SlashCommandBuilder().setName('rank').setDescription('Uyarı tablosunu gösterir (Pro üyelere özel).'),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucuda kullanılabilir.', ephemeral: true });
      return;
    }

    const entries = await getGuildWarningEntries(interaction.guild.id);
    const formatted = entries
      .map((entry) => ({ userId: entry.userId, count: entry.warnings.length }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count || a.userId.localeCompare(b.userId));

    const embed = buildWarningLeaderboard({ guild: interaction.guild, entries: formatted });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
