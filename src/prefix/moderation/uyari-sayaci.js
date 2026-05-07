import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import { listWarnings } from '../../utils/warnStorage.js';

export default {
  name: 'uyari-sayaci',
  aliases: ['uyarisayaci', 'usayaci'],
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  description: 'Belirtilen üyenin uyarı kayıtlarını özetler.',
  requiredPermissions: [PermissionsBitField.Flags.ModerateMembers],
  async execute(message, args) {
    const mention = message.mentions.users.first();
    const targetId = mention?.id ?? args[0];

    if (!targetId) {
      await message.reply({
        content: '⛔ İncelemek istediğin üyeyi etiketlemeli veya kullanıcı ID\'sini yazmalısın.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const warnings = await listWarnings(message.guildId ?? '', targetId);
    const targetUser = mention ?? (await message.client.users.fetch(targetId).catch(() => null));
    const displayName = targetUser?.tag ?? targetId;

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('📂 Uyarı Sayacı')
      .setDescription(`**${displayName}** kullanıcısının kayıtlı uyarıları listeleniyor.`)
      .addFields({ name: 'Toplam Uyarı', value: `${warnings.length}`, inline: true })
      .setFooter({ text: 'Furmin uyarı arşivi' })
      .setTimestamp();

    if (warnings.length) {
      const latest = warnings.slice(-3);
      embed.addFields({
        name: 'Son Uyarılar',
        value: latest
          .map((warning, index) => {
            const number = warnings.length - latest.length + index + 1;
            return `${number}. ${warning.reason || 'Sebep belirtilmemiş.'}`;
          })
          .join('\n')
      });
    } else {
      embed.addFields({ name: 'Detay', value: 'Kullanıcının aktif uyarısı bulunmuyor.' });
    }

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
