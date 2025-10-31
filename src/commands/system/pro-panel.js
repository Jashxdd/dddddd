import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { describePrefix } from '../../utils/prefixStorage.js';
import { getModLogChannelId } from '../../utils/modLogStorage.js';
import { getBannedWords, isAutomodEnabled } from '../../utils/automodConfig.js';
import { getAcceptedUsers } from '../../utils/rulesStorage.js';
import { getWarningStats } from '../../utils/warnStorage.js';
import { isProMember, listProMembers } from '../../utils/proMembership.js';

export default {
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  data: new SlashCommandBuilder()
    .setName('pro-panel')
    .setDescription('Pro üyeler için Furmin sistem özetini gösterir.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const guildId = interaction.guildId;

    const [prefixInfo, modLogId, automod, bannedWords, acceptedUsers, warningStats, proMembers, isMember] = await Promise.all([
      describePrefix(guildId ?? ''),
      getModLogChannelId(guildId ?? ''),
      isAutomodEnabled(guildId ?? ''),
      getBannedWords(guildId ?? ''),
      getAcceptedUsers(guildId ?? ''),
      getWarningStats(guildId ?? ''),
      listProMembers(),
      isProMember(interaction.user.id)
    ]);

    let modLogDisplay = 'Ayarlanmamış';
    if (modLogId) {
      const targetChannel =
        interaction.guild.channels.cache.get(modLogId) ?? (await interaction.guild.channels.fetch(modLogId).catch(() => null));
      modLogDisplay = targetChannel ? `${targetChannel}` : `#${modLogId} (bulunamadı)`;
    }

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('💎 Furmin Pro Kontrol Paneli')
      .setDescription('Sunucunun kritik ayarlarının hızlı özetini görüntülersin. Değerler anlık olarak günceldir.')
      .addFields(
        {
          name: 'Sunucu Durumu',
          value: [
            `• Prefix: \`${prefixInfo.prefix}\`${prefixInfo.isCustom ? ' (özel)' : ''}`,
            `• Kuralları kabul eden üye: **${acceptedUsers.length}**`,
            `• Mod-log kanalı: ${modLogDisplay}`
          ].join('\n')
        },
        {
          name: 'Otomasyon',
          value: [
            `• Yerel otomod: **${automod ? 'Açık' : 'Kapalı'}**`,
            `• Yasaklı kelime sayısı: **${bannedWords.length}**`,
            `• Uyarı kayıtları: **${warningStats.totalWarnings}** uyarı / **${warningStats.totalUsers}** üye`
          ].join('\n')
        },
        {
          name: 'Pro Özet',
          value: [
            `• Toplam Pro üyesi: **${proMembers.length}**`,
            `• Senin durumun: **${isMember ? 'Aktif' : 'Bekleniyor'}**`,
            '• Ayrıntılı komut listesi için `/premium-komutlar` komutunu kullan.'
          ].join('\n')
        }
      )
      .setFooter({ text: 'Bu panel yalnızca Pro üyeler tarafından görülebilir.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
