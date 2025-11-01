import { buildWarningLeaderboard } from '../../commands/general/rank.js';
import { getGuildWarningEntries } from '../../utils/warnStorage.js';

export default {
  name: 'rank',
  aliases: ['uyari-siralama'],
  category: 'Extra',
  description: 'Uyarı liderlik tablosunu gösterir (Pro).',
  menuGroup: 'Pro Üyelik',
  proOnly: true,
  async execute(message) {
    if (!message.guild) {
      await message.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.' });
      return;
    }

    const entries = await getGuildWarningEntries(message.guild.id);
    const formatted = entries
      .map((entry) => ({ userId: entry.userId, count: entry.warnings.length }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count || a.userId.localeCompare(b.userId));

    const embed = buildWarningLeaderboard({ guild: message.guild, entries: formatted });
    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
