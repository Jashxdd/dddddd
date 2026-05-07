import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import { getGuildWarningEntries } from '../../utils/warnStorage.js';

export default {
  name: 'pro-uyari-analiz',
  aliases: ['prouyari', 'puyarianaliz'],
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  description: 'Uyarı kayıtlarını analiz ederek en çok uyarı alan üyeleri gösterir.',
  requiredPermissions: [PermissionsBitField.Flags.ModerateMembers],
  async execute(message) {
    const entries = await getGuildWarningEntries(message.guildId ?? '');
    const sorted = entries
      .filter((entry) => Array.isArray(entry.warnings) && entry.warnings.length)
      .sort((a, b) => b.warnings.length - a.warnings.length)
      .slice(0, 5);

    const embed = new EmbedBuilder()
      .setColor(0xbdc3c7)
      .setTitle('📈 Pro Uyarı Analizi')
      .setDescription('En çok uyarı alan üyelerin hızlı bir özetini sunar.')
      .setFooter({ text: 'Furmin Pro denetim aracı' })
      .setTimestamp();

    if (sorted.length) {
      embed.addFields({
        name: 'Öne Çıkan Kayıtlar',
        value: sorted
          .map((entry, index) => `#${index + 1} <@${entry.userId}> — ${entry.warnings.length} uyarı`)
          .join('\n')
      });
    } else {
      embed.addFields({ name: 'Durum', value: 'Sunucuda kayıtlı uyarı bulunmuyor.' });
    }

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
