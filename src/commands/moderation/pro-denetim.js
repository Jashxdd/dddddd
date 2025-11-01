import { ChannelType, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { getBannedWords, isAutomodEnabled } from '../../utils/automodConfig.js';
import { getModLogChannelId } from '../../utils/modLogStorage.js';
import { getWarningStats } from '../../utils/warnStorage.js';

export default {
  category: 'Moderasyon',
  menuGroup: 'Pro Moderasyon',
  proOnly: true,
  data: new SlashCommandBuilder()
    .setName('pro-denetim')
    .setDescription('Pro üyeler için Furmin moderasyon ayarlarının özetini gösterir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addBooleanOption((option) =>
      option
        .setName('tam-detay')
        .setDescription('Bütün yasaklı kelimeleri listele (maks. 25).')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    const [modLogId, automodState, bannedWords, warningStats] = await Promise.all([
      getModLogChannelId(guildId),
      isAutomodEnabled(guildId),
      getBannedWords(guildId),
      getWarningStats(guildId)
    ]);

    let modLogLabel = 'Ayarlanmamış';
    if (modLogId) {
      const cached = interaction.guild.channels.cache.get(modLogId);
      const channel = cached ?? (await interaction.guild.channels.fetch(modLogId).catch(() => null));
      if (channel && channel.type === ChannelType.GuildText) {
        modLogLabel = `${channel} (${channel.id})`;
      } else {
        modLogLabel = `Kanal bulunamadı (${modLogId}).`;
      }
    }

    const listAll = interaction.options.getBoolean('tam-detay') ?? false;
    const visibleWords = listAll ? bannedWords.slice(0, 25) : bannedWords.slice(0, 10);

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle('🛡️ Pro Moderasyon Denetimi')
      .setDescription(
        'Bu rapor, Furmin Pro ayrıcalıklarıyla kullanılan gelişmiş moderasyon ayarlarının hızlı özetini içerir.'
      )
      .addFields(
        { name: 'Mod-log Kanalı', value: modLogLabel, inline: false },
        { name: 'Yerel AutoMod', value: automodState ? '✅ Açık' : '⚪ Kapalı', inline: true },
        { name: 'Banlanan Kelime Sayısı', value: `${bannedWords.length}`, inline: true },
        { name: 'Uyarı Kaydı (Üye)', value: `${warningStats.totalUsers}`, inline: true },
        { name: 'Toplam Uyarı', value: `${warningStats.totalWarnings}`, inline: true }
      )
      .setFooter({ text: 'Furmin Pro Moderasyon Paneli' })
      .setTimestamp();

    if (visibleWords.length) {
      embed.addFields({
        name: `Yasaklı Kelimeler (${visibleWords.length}/${bannedWords.length})`,
        value: visibleWords.map((word, index) => `${index + 1}. \`${word}\``).join('\n')
      });
    } else {
      embed.addFields({ name: 'Yasaklı Kelimeler', value: 'Herhangi bir kelime eklenmemiş.' });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
