import { buildLevelLeaderboard } from '../../commands/general/rank.js';
import { getLeaderboard, getLevelConfig } from '../../utils/xpStorage.js';

export default {
  name: 'rank',
  aliases: ['uyari-siralama'],
  category: 'Extra',
  description: 'XP liderlik tablosunu gösterir (Pro).',
  menuGroup: 'Pro Üyelik',
  proOnly: true,
  async execute(message) {
    if (!message.guild) {
      await message.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.' });
      return;
    }

    const levelConfig = getLevelConfig();
    if (!levelConfig.enabled) {
      await message.reply({ content: 'Seviye sistemi bu sunucuda devre dışı. Yönetim ile iletişime geçebilirsin.' });
      return;
    }

    const entries = await getLeaderboard(message.guild.id, 10);

    const embed = buildLevelLeaderboard({ guild: message.guild, entries });
    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
