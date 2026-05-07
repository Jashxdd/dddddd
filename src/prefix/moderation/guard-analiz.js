import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import { getGuardConfig, guardProtectionGroups } from '../../utils/guardConfigStorage.js';

function resolveChannelLabel(guild, channelId) {
  if (!channelId) return 'Ayarlanmamış';
  const channel = guild?.channels?.cache?.get(channelId);
  return channel ? channel.toString() : `#${channelId}`;
}

function describeGroupStates(config) {
  return Object.entries(guardProtectionGroups).map(([key, group]) => {
    const enabledCount = group.keys.filter((protectionKey) => config.protections?.[protectionKey]).length;
    const isActive = enabledCount === group.keys.length;
    const isPartial = !isActive && enabledCount > 0;
    const stateEmoji = isActive ? '🟢' : isPartial ? '🟠' : '⚪';
    const suffix = isPartial ? ' (kısmi)' : isActive ? '' : ' (kapalı)';
    return `${stateEmoji} ${group.emoji} **${group.label}**${suffix}`;
  });
}

export default {
  name: 'guard-analiz',
  aliases: ['guardanaliz', 'guardozet'],
  category: 'Moderasyon',
  menuGroup: 'Guard Araçları',
  description: 'Guard korumasının log, yaptırım ve grup durumlarını özetler.',
  requiredPermissions: [PermissionsBitField.Flags.ManageGuild],
  async execute(message) {
    const guildId = message.guildId;
    if (!guildId) {
      await message.reply({
        content: '🛡️ Guard analizini yalnızca sunucularda görüntüleyebilirsin.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const config = await getGuardConfig(guildId);
    const lines = describeGroupStates(config);
    const updatedAt = config.updatedAt
      ? `<t:${Math.floor(config.updatedAt / 1000)}:R>`
      : 'Henüz güncellenmedi';

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('🛡️ Guard Analizi')
      .setDescription(
        [
          `• Guard yaptırımı: **${config.penalty.toUpperCase()}**`,
          `• Guard log kanalı: ${resolveChannelLabel(message.guild, config.logChannelId)}`,
          `• Son güncelleme: ${updatedAt}`
        ].join('\n')
      )
      .addFields({ name: 'Koruma Grupları', value: lines.join('\n') || 'Koruma grubu etkin değil.' })
      .setFooter({ text: 'Furmin guard yönetimi' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
