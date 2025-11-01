import { PermissionsBitField } from 'discord.js';
import { describePrefix, setPrefix, resetPrefix } from '../../utils/prefixStorage.js';

function validatePrefix(prefix) {
  const trimmed = prefix.trim();
  if (!trimmed.length || trimmed.length > 5) {
    throw new Error('Prefix 1-5 karakter arasında olmalı.');
  }
  return trimmed;
}

export default {
  name: 'prefix',
  aliases: ['prefix-ayarla'],
  category: 'Sistem',
  description: 'Sunucudaki prefixi görüntüler veya değiştirir.',
  requiredPermissions: [PermissionsBitField.Flags.ManageGuild],
  menuGroup: 'Sistemler',
  async execute(message, args) {
    if (!args.length) {
      const info = await describePrefix(message.guild.id);
      await message.reply({
        content: `🔎 Geçerli prefix: **${info.prefix}** ${info.isCustom ? '(özel)' : '(varsayılan)'}`,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const sub = args[0].toLowerCase();
    if (sub === 'sifirla' || sub === 'reset') {
      const value = await resetPrefix(message.guild.id);
      await message.reply({
        content: `🔄 Prefix varsayılan değerlere döndürüldü: **${value}**`,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    try {
      const newPrefix = validatePrefix(sub);
      await setPrefix(message.guild.id, newPrefix);
      await message.reply({
        content: `✅ Prefix başarıyla **${newPrefix}** olarak ayarlandı. Yardım menüsü ve komutlar güncellendi.`,
        allowedMentions: { repliedUser: false }
      });
    } catch (error) {
      await message.reply({ content: `❌ ${error.message}`, allowedMentions: { repliedUser: false } });
    }
  }
};
