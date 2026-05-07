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
    .setName('rol-ver')
    .setDescription('Belirtilen kullanıcıya rol verir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((option) =>
      option.setName('kullanici').setDescription('Rol verilecek kullanıcı').setRequired(true)
    )
    .addRoleOption((option) => option.setName('rol').setDescription('Verilecek rol').setRequired(true))
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

    if (member.roles.cache.has(role.id)) {
      await interaction.reply({ content: 'Kullanıcının üzerinde zaten bu rol bulunuyor.', ephemeral: true });
      return;
    }

    const executor = interaction.member;
    const me = interaction.guild.members.me;

    if (!canManageRole(executor, role)) {
      await interaction.reply({ content: 'Bu rolü vermek için yetkin yok.', ephemeral: true });
      return;
    }

    if (!canManageRole(me, role)) {
      await interaction.reply({ content: 'Bu rolü vermek için botun yetkisi yetersiz.', ephemeral: true });
      return;
    }

    try {
      await member.roles.add(role, `${interaction.user.tag}: ${reason}`);
    } catch (error) {
      console.error('Rol verilirken hata oluştu:', error);
      await interaction.reply({ content: 'Rol verilirken bir hata oluştu.', ephemeral: true });
      return;
    }

    await interaction.reply({
      content: `✅ ${member} kullanıcısına ${role} rolü verildi.`,
      ephemeral: true
    });

    await sendModerationLog(interaction.client, interaction.guildId, {
      action: 'Rol Verildi',
      moderatorUser: interaction.user,
      targetUser: member.user,
      reason,
      color: 0x2ecc71,
      extraFields: [{ name: 'Verilen Rol', value: `${role.name} (${role.id})`, inline: true }]
    });
  }
};
