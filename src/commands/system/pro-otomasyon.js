import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getBannedWords, isAutomodEnabled } from '../../utils/automodConfig.js';
import { describeAutoRoles } from '../../utils/autoRoleStorage.js';

export default {
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  data: new SlashCommandBuilder()
    .setName('pro-otomasyon')
    .setDescription('AutoMod, yasaklı kelime ve otorol durumunu birlikte raporlar.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const guildId = interaction.guildId ?? '';

    const [automodState, bannedWords, autoRoleSummary] = await Promise.all([
      isAutomodEnabled(guildId),
      getBannedWords(guildId),
      describeAutoRoles(guildId, interaction.guild)
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x6c5ce7)
      .setTitle('🤖 Pro Otomasyon Özeti')
      .addFields(
        { name: 'Yerel AutoMod', value: automodState ? '✅ Açık' : '⚪ Kapalı', inline: true },
        { name: 'Yasaklı Kelimeler', value: `${bannedWords.length}`, inline: true },
        {
          name: 'Otorol',
          value:
            autoRoleSummary.count > 0
              ? `${autoRoleSummary.count} rol (${autoRoleSummary.mentionList})`
              : 'Tanımlı otomatik rol bulunmuyor.'
        }
      )
      .setFooter({ text: 'Furmin Pro otomasyon denetimi' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
