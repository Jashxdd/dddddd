import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import { describePrefix } from '../../utils/prefixStorage.js';
import { getModLogChannelId } from '../../utils/modLogStorage.js';
import { getBannedWords, isAutomodEnabled } from '../../utils/automodConfig.js';
import { describeAutoRoles } from '../../utils/autoRoleStorage.js';
import { getWarningStats } from '../../utils/warnStorage.js';

export default {
  name: 'denetim-kontrol',
  aliases: ['denetim', 'kontrol'],
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  description: 'Mod-log, otomasyon ve uyarı durumunu hızlıca özetler.',
  requiredPermissions: [PermissionsBitField.Flags.ManageGuild],
  async execute(message) {
    const guildId = message.guildId ?? '';

    const [prefixInfo, modLogId, automodState, bannedWords, warningStats, autoRoleSummary] = await Promise.all([
      describePrefix(guildId),
      getModLogChannelId(guildId),
      isAutomodEnabled(guildId),
      getBannedWords(guildId),
      getWarningStats(guildId),
      describeAutoRoles(guildId, message.guild)
    ]);

    let modLogLabel = 'Ayarlanmamış';
    if (modLogId) {
      const cached = message.guild.channels.cache.get(modLogId);
      const channel = cached ?? (await message.guild.channels.fetch(modLogId).catch(() => null));
      modLogLabel = channel ? `${channel} (${channel.id})` : `Kanal bulunamadı (${modLogId})`;
    }

    const embed = new EmbedBuilder()
      .setColor(0x2980b9)
      .setTitle('🧾 Denetim Kontrol Paneli')
      .addFields(
        {
          name: 'Temel Ayarlar',
          value: [`• Prefix: \`${prefixInfo.prefix}\``, `• Mod-log: ${modLogLabel}`, `• Yerel AutoMod: ${automodState ? '✅ Açık' : '⚪ Kapalı'}`].join('\n')
        },
        {
          name: 'Uyarı & Filtre Durumu',
          value: [`• Yasaklı kelimeler: **${bannedWords.length}**`, `• Kayıtlı uyarılar: **${warningStats.totalWarnings}**`, `• Etkilenen üye: **${warningStats.totalUsers}**`].join('\n')
        },
        {
          name: 'Otomatik Roller',
          value:
            autoRoleSummary.count > 0
              ? `${autoRoleSummary.count} rol yapılandırıldı: ${autoRoleSummary.mentionList}`
              : 'Herhangi bir otomatik rol ayarlanmamış.'
        }
      )
      .setFooter({ text: 'Furmin moderasyon kontrol listesi' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
