import { PermissionsBitField } from 'discord.js';
import { listWarnings } from '../../utils/warnStorage.js';
import { buildWarningHistoryEmbed } from '../../commands/moderation/sicil.js';

export default {
  name: 'sicil',
  aliases: ['ceza'],
  category: 'Moderasyon',
  description: 'Belirtilen üyenin uyarı geçmişini gönderir.',
  requiredPermissions: [PermissionsBitField.Flags.ModerateMembers],
  menuGroup: 'Koruma & Log',
  async execute(message, args) {
    if (!message.guild) {
      await message.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.' });
      return;
    }

    const mentionTarget = message.mentions.members?.first();
    let fetched = null;
    if (!mentionTarget && args[0]) {
      const id = args[0].replace(/[^0-9]/g, '');
      if (id) {
        fetched = await message.guild.members.fetch({ user: id, cache: true }).catch(() => null);
      }
    }
    const target = mentionTarget ?? fetched ?? message.member;

    if (!target) {
      await message.reply({
        content: 'Kullanıcı bulunamadı. Bir üyeyi etiketleyerek veya ID girerek tekrar dene.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const warnings = await listWarnings(message.guild.id, target.id);
    const embed = buildWarningHistoryEmbed({
      guild: message.guild,
      member: target,
      warnings,
      requester: message.author
    });

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
