import { EmbedBuilder } from 'discord.js';
import { getBannedWords, isAutomodEnabled } from '../../utils/automodConfig.js';
import { describeAutoRoles } from '../../utils/autoRoleStorage.js';

export default {
  name: 'pro-otomasyon',
  aliases: ['prootomasyon', 'potomasyon'],
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  description: 'AutoMod, yasaklı kelime ve otorol durumunu birlikte raporlar.',
  async execute(message) {
    const guildId = message.guildId ?? '';

    const [automodState, bannedWords, autoRoleSummary] = await Promise.all([
      isAutomodEnabled(guildId),
      getBannedWords(guildId),
      describeAutoRoles(guildId, message.guild)
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

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
