import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getModLogChannelId } from '../../utils/modLogStorage.js';
import { getBannedWords, isAutomodEnabled } from '../../utils/automodConfig.js';
import { getKeywordRuleInfo } from '../../utils/discordAutomod.js';
import { getWarningStats } from '../../utils/warnStorage.js';
import { getAcceptedUsers } from '../../utils/rulesStorage.js';
import { describeAutoRoles } from '../../utils/autoRoleStorage.js';

export default {
  category: 'Sistem',
  data: new SlashCommandBuilder().setName('ayarlar').setDescription('Botun sunucuya özel ayarlarının özetini gösterir.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    const [
      modLogChannelId,
      automodEnabled,
      bannedWords,
      discordAutomodInfo,
      warningStats,
      acceptedUsers,
      autoRoleSummary
    ] = await Promise.all([
      getModLogChannelId(guildId),
      isAutomodEnabled(guildId),
      getBannedWords(guildId),
      getKeywordRuleInfo(interaction.guild),
      getWarningStats(guildId),
      getAcceptedUsers(guildId),
      describeAutoRoles(guildId, interaction.guild)
    ]);

    const modLogChannel = modLogChannelId
      ? await interaction.guild.channels.fetch(modLogChannelId).catch(() => null)
      : null;

    const discordKeywordCount = Array.isArray(discordAutomodInfo.keywords)
      ? discordAutomodInfo.keywords.length
      : 0;

    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle(`${interaction.guild.name} • Bot Ayar Özeti`)
      .setThumbnail(interaction.guild.iconURL({ size: 256 }) ?? null)
      .addFields(
        {
          name: 'Mod-Log',
          value: modLogChannel ? `🟢 Aktif • ${modLogChannel}` : '🔴 Ayarlanmamış',
          inline: true
        },
        {
          name: 'Kurallar Sistemi',
          value: acceptedUsers.length
            ? `📝 ${acceptedUsers.length} kişi kuralları kabul etti.`
            : '⚠️ Kuralları kabul eden kayıtlı bir üye bulunmuyor.',
          inline: true
        },
        {
          name: 'Otomatik Roller',
          value:
            autoRoleSummary.count > 0
              ? `🔁 ${autoRoleSummary.count} rol: ${autoRoleSummary.mentionList}`
              : '⚪ Ayarlanmamış. `/otorol ekle` ile hızlıca kurabilirsiniz.',
          inline: true
        },
        {
          name: 'Uyarı Kayıtları',
          value:
            warningStats.totalWarnings > 0
              ? `🚨 Toplam ${warningStats.totalWarnings} uyarı • ${warningStats.totalUsers} üye`
              : '✅ Kayıtlı uyarı bulunmuyor.',
          inline: true
        }
      )
      .addFields(
        {
          name: 'Yerel Kelime Filtresi',
          value: automodEnabled
            ? `🛡️ Aktif • Yasaklı kelime sayısı: **${bannedWords.length}**`
            : '⚪ Pasif • `/otomod` ile etkinleştirebilirsiniz.',
          inline: true
        },
        {
          name: 'Discord AutoMod',
          value: discordAutomodInfo.exists
            ? discordAutomodInfo.enabled
              ? `🟢 Aktif • Kelime sayısı: **${discordKeywordCount}**`
              : '🟡 Kural mevcut fakat devre dışı.'
            : '⚪ Kural tanımlanmamış. `/discord-otomod` ile kurulabilir.',
          inline: true
        },
        {
          name: 'Komut Sayısı',
          value: `Slash komutlar: **${interaction.client.commands.size}**`,
          inline: true
        }
      )
      .setFooter({ text: `${interaction.client.user.username} • Sunucu ayar raporu` })
      .setTimestamp();

    if (bannedWords.length) {
      const preview = bannedWords.slice(0, 10).map((word) => `• ${word}`).join('\n');
      embed.addFields({
        name: 'Yasaklı Kelime Önizlemesi',
        value: bannedWords.length > 10 ? `${preview}\n... ve ${bannedWords.length - 10} kelime daha` : preview
      });
    }

    if (discordAutomodInfo.exists && discordKeywordCount) {
      const preview = discordAutomodInfo.keywords.slice(0, 10).map((word) => `• ${word}`).join('\n');
      embed.addFields({
        name: 'Discord AutoMod Kelimeleri',
        value:
          discordKeywordCount > 10
            ? `${preview}\n... ve ${discordKeywordCount - 10} kelime daha`
            : preview
      });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
