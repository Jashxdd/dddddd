import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getGuildWarningEntries, getWarningStats } from '../../utils/warnStorage.js';

export default {
  name: 'mod-uyari-ozet',
  aliases: ['moduyariozet', 'uyari-ozet'],
  catalogKey: 'mod-uyari-ozet',
  category: 'Moderasyon',
  description: 'Sunucudaki uyarı dağılımını moderatörlere özetler.',
  menuGroup: 'Denetim',
  async execute(message) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ModerateMembers)) {
      await message.reply({
        content: '⚖️ Bu özeti görüntülemek için moderasyon yetkisine sahip olmalısın.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const [stats, entries] = await Promise.all([
      getWarningStats(message.guildId),
      getGuildWarningEntries(message.guildId)
    ]);

    const top = entries
      .map((entry) => ({ userId: entry.userId, count: entry.warnings.length }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle('⚖️ Uyarı Dağılım Özeti')
      .addFields(
        { name: 'Toplam Uyarı', value: `${stats.totalWarnings}`, inline: true },
        { name: 'Etkilenen Üye', value: `${stats.totalUsers}`, inline: true }
      )
      .setTimestamp();

    if (top.length) {
      const lines = top.map((entry, index) => `**${index + 1}.** <@${entry.userId}> — ${entry.count} uyarı`);
      embed.addFields({ name: 'Öne Çıkan Üyeler', value: lines.join('\n') });
    } else {
      embed.addFields({ name: 'Öne Çıkan Üyeler', value: 'Kayıtlı uyarı bulunmuyor.' });
    }

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
