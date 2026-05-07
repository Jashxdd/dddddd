import { EmbedBuilder, PermissionsBitField } from 'discord.js';

const CRITICAL_PERMISSIONS = [
  { flag: PermissionsBitField.Flags.Administrator, label: 'Yönetici' },
  { flag: PermissionsBitField.Flags.ManageGuild, label: 'Sunucuyu Yönet' },
  { flag: PermissionsBitField.Flags.ManageChannels, label: 'Kanalları Yönet' },
  { flag: PermissionsBitField.Flags.ManageMessages, label: 'Mesajları Yönet' },
  { flag: PermissionsBitField.Flags.ModerateMembers, label: 'Üyeleri Zaman Aşımına Sok' }
];

export default {
  name: 'rol-inceleme',
  aliases: ['rolinceleme', 'rinceleme'],
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  description: 'Bir rolün üye sayısı ve kritik izinlerini özetler.',
  requiredPermissions: [PermissionsBitField.Flags.ManageRoles],
  async execute(message, args) {
    const roleMention = message.mentions.roles.first();
    const roleId = roleMention?.id ?? args[0];

    if (!roleId) {
      await message.reply({
        content: '⛔ İnceleyeceğin rolü etiketlemeli veya rol ID\'sini yazmalısın.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const role = roleMention ?? (await message.guild.roles.fetch(roleId).catch(() => null));
    if (!role) {
      await message.reply({
        content: 'Belirtilen rol bulunamadı.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const granted = CRITICAL_PERMISSIONS.filter(({ flag }) => role.permissions.has(flag));

    const embed = new EmbedBuilder()
      .setColor(role.color || 0x9b59b6)
      .setTitle('🗂️ Rol İnceleme')
      .addFields(
        { name: 'Rol', value: `${role} (${role.id})` },
        { name: 'Üye Sayısı', value: `${role.members.size}`, inline: true },
        { name: 'Renk', value: role.hexColor, inline: true }
      )
      .setFooter({ text: 'Furmin rol inceleme aracı' })
      .setTimestamp();

    if (granted.length) {
      embed.addFields({
        name: 'Kritik İzinler',
        value: granted.map(({ label }) => `✅ ${label}`).join('\n')
      });
    } else {
      embed.addFields({ name: 'Kritik İzinler', value: 'Bu rolde kritik yetki bulunmuyor.' });
    }

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
