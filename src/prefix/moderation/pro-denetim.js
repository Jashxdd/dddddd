import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import { getBannedWords, isAutomodEnabled } from '../../utils/automodConfig.js';
import { getModLogChannelId } from '../../utils/modLogStorage.js';
import { getWarningStats } from '../../utils/warnStorage.js';

export default {
  name: 'prodenetim',
  aliases: ['pro-denetim', 'pdenetim'],
  category: 'Moderasyon',
  menuGroup: 'Pro Moderasyon',
  proOnly: true,
  description: 'Pro üyeler için moderasyon ayarlarını özetler.',
  requiredPermissions: [PermissionsBitField.Flags.ModerateMembers],
  async execute(message, args) {
    const guildId = message.guildId;
    const listAll = args.some((arg) => arg.toLowerCase() === '--tam' || arg.toLowerCase() === 'tam');

    const [modLogId, automodState, bannedWords, warningStats] = await Promise.all([
      getModLogChannelId(guildId),
      isAutomodEnabled(guildId),
      getBannedWords(guildId),
      getWarningStats(guildId)
    ]);

    let modLogLabel = 'Ayarlanmamış';
    if (modLogId) {
      const cached = message.guild.channels.cache.get(modLogId);
      const channel = cached ?? (await message.guild.channels.fetch(modLogId).catch(() => null));
      if (channel) {
        modLogLabel = `${channel} (${channel.id})`;
      } else {
        modLogLabel = `Kanal bulunamadı (${modLogId}).`;
      }
    }

    const visibleWords = listAll ? bannedWords.slice(0, 25) : bannedWords.slice(0, 10);

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle('🛡️ Pro Moderasyon Denetimi')
      .setDescription('Furmin Pro ile etkinleştirilen moderasyon araçlarının güncel durumunu gösterir.')
      .addFields(
        { name: 'Mod-log Kanalı', value: modLogLabel, inline: false },
        { name: 'Yerel AutoMod', value: automodState ? '✅ Açık' : '⚪ Kapalı', inline: true },
        { name: 'Banlanan Kelime Sayısı', value: `${bannedWords.length}`, inline: true },
        { name: 'Uyarı Kaydı (Üye)', value: `${warningStats.totalUsers}`, inline: true },
        { name: 'Toplam Uyarı', value: `${warningStats.totalWarnings}`, inline: true }
      )
      .setFooter({ text: listAll ? 'Liste --tam seçeneği ile genişletildi.' : 'Daha fazla kelime için --tam seçeneğini kullan.' })
      .setTimestamp();

    if (visibleWords.length) {
      embed.addFields({
        name: `Yasaklı Kelimeler (${visibleWords.length}/${bannedWords.length})`,
        value: visibleWords.map((word, index) => `${index + 1}. \`${word}\``).join('\n')
      });
    } else {
      embed.addFields({ name: 'Yasaklı Kelimeler', value: 'Herhangi bir kelime eklenmemiş.' });
    }

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
