import { PermissionFlagsBits } from 'discord.js';
import {
  getGuardConfig,
  guardPenaltyLabels,
  guardProtectionLabels
} from '../../utils/guardConfigStorage.js';
function formatProtections(config) {
  return Object.entries(guardProtectionLabels)
    .map(([key, label]) => {
      const state = config.protections?.[key] ? '🛡️' : '⚪';
      return `${state} ${label}`;
    })
    .join('\n');
}

export default {
  name: 'pro-guard-ozet',
  aliases: ['proguard'],
  catalogKey: 'pro-guard-ozet',
  category: 'Sistem',
  menuGroup: 'Pro Araçları',
  description: 'Guard koruma ve log ayarlarını hızlıca özetler.',
  proOnly: true,
  usage: 'pro-guard-ozet',
  async execute(message) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply({
        content: '🛡️ Guard özetini görüntülemek için **Sunucuyu Yönet** yetkisine sahip olmalısın.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const config = await getGuardConfig(message.guild.id);
    const embedLines = [
      `• Log Kanalı: ${config.logChannelId ? `<#${config.logChannelId}>` : 'Ayarlanmamış'}`,
      `• Yaptırım: ${guardPenaltyLabels[config.penalty] ?? 'Belirlenmemiş'}`,
      '',
      formatProtections(config)
    ];

    await message.reply({
      content: `🛡️ **Guard Özeti**\n${embedLines.join('\n')}`,
      allowedMentions: { repliedUser: false }
    });
  }
};
