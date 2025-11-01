import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { sendModerationLog } from '../../utils/modLog.js';

function canManageRole(executor, role) {
  if (!executor || !role) return false;
  if (!executor.permissions.has(PermissionFlagsBits.ManageRoles)) return false;
  return executor.roles.highest.comparePositionTo(role) > 0;
}

export default {
  category: 'Moderasyon',
  data: new SlashCommandBuilder()
    .setName('rol-al')
    .setDescription('Belirtilen kullanıcıdan rolü kaldırır.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((option) =>
      option.setName('kullanici').setDescription('Rolü alınacak kullanıcı').setRequired(true)
    )
    .addRoleOption((option) => option.setName('rol').setDescription('Alınacak rol').setRequired(true))
    .addStringOption((option) =>
      option
        .setName('sebep')
        .setDescription('İsteğe bağlı sebep')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser('kullanici', true);
    const role = interaction.options.getRole('rol', true);
    const reason = interaction.options.getString('sebep') ?? 'Sebep belirtilmedi';

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: 'Belirtilen kullanıcı bu sunucuda bulunamadı.', ephemeral: true });
      return;
    }

    if (!member.roles.cache.has(role.id)) {
      await interaction.reply({ content: 'Kullanıcının üzerinde bu rol bulunmuyor.', ephemeral: true });
      return;
    }

    const executor = interaction.member;
    const me = interaction.guild.members.me;

    if (!canManageRole(executor, role)) {
      await interaction.reply({ content: 'Bu rolü kaldırmak için yetkin yok.', ephemeral: true });
      return;
    }

    if (!canManageRole(me, role)) {
      await interaction.reply({ content: 'Bu rolü kaldırmak için botun yetkisi yetersiz.', ephemeral: true });
      return;
    }

    try {
      await member.roles.remove(role, `${interaction.user.tag}: ${reason}`);
    } catch (error) {
      console.error('Rol kaldırılırken hata oluştu:', error);
      await interaction.reply({ content: 'Rol kaldırılırken bir hata oluştu.', ephemeral: true });
      return;
    }

    await interaction.reply({
      content: `✅ ${member} kullanıcısından ${role} rolü kaldırıldı.`,
      ephemeral: true
    });

    await sendModerationLog(interaction.client, interaction.guildId, {
      action: 'Rol Kaldırıldı',
      moderatorUser: interaction.user,
      targetUser: member.user,
      reason,
      color: 0xe67e22,
      extraFields: [{ name: 'Kaldırılan Rol', value: `${role.name} (${role.id})`, inline: true }]
    });
  }
};
