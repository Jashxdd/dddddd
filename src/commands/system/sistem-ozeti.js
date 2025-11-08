import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { describePrefix } from '../../utils/prefixStorage.js';
import { getModLogChannelId } from '../../utils/modLogStorage.js';
import { getBannedWords, isAutomodEnabled } from '../../utils/automodConfig.js';
import { listProMembers } from '../../utils/proMembership.js';
import { config } from '../../config.js';

export default {
  category: 'Sistem',
  menuGroup: 'Sistemler',
  deferEphemeral: true,
  data: new SlashCommandBuilder()
    .setName('sistem-ozeti')
    .setDescription('Sunucudaki Furmin sistemlerinin durumunu raporlar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const [prefixInfo, modLogChannelId, automodEnabled, bannedWords, proMembers] = await Promise.all([
      describePrefix(interaction.guildId),
      getModLogChannelId(interaction.guildId),
      isAutomodEnabled(interaction.guildId),
      getBannedWords(interaction.guildId),
      listProMembers()
    ]);

    const prefixFieldValue = prefixInfo.isCustom
      ? `Varsayılan: \`${config.defaultPrefix}\`\nEtkin: \`${prefixInfo.prefix}\``
      : `Varsayılan ve etkin: \`${config.defaultPrefix}\``;

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('⚙️ Furmin Sistem Özeti')
      .setDescription("Bu rapor, Furmin'in kritik sistemlerinin anlık durumunu gösterir.")
      .addFields(
        { name: 'Önek', value: prefixFieldValue },
        {
          name: 'Mod-Log',
          value: modLogChannelId ? `<#${modLogChannelId}> kanalı kullanılıyor.` : 'Mod-log kanalı henüz ayarlanmadı.'
        },
        {
          name: 'Yerel Otomatik Moderasyon',
          value: automodEnabled
            ? `Aktif • Yasaklı kelime sayısı: **${bannedWords.length}**`
            : 'Pasif • `/automod` ile etkinleştirebilirsin.'
        },
        {
          name: 'Discord AutoMod',
          value:
            'Sunucu ayarlarıyla entegre çalışır. `/discord-automod` komutu ile filtreleri güncelleyebilirsin.'
        },
        {
          name: 'Pro Üye Sayısı',
          value: proMembers.length ? `${proMembers.length} üye yetkilendirildi.` : 'Pro üyelik verilmemiş.'
        }
      )
      .setFooter({ text: 'Kurulum ve detaylar için /ayarlar komutunu kullan.' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
