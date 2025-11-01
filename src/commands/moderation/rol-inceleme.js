import { EmbedBuilder, PermissionsBitField, SlashCommandBuilder } from 'discord.js';

const CRITICAL_PERMISSIONS = [
  { flag: PermissionsBitField.Flags.Administrator, label: 'Yönetici' },
  { flag: PermissionsBitField.Flags.ManageGuild, label: 'Sunucuyu Yönet' },
  { flag: PermissionsBitField.Flags.ManageChannels, label: 'Kanalları Yönet' },
  { flag: PermissionsBitField.Flags.ManageMessages, label: 'Mesajları Yönet' },
  { flag: PermissionsBitField.Flags.ModerateMembers, label: 'Üyeleri Zaman Aşımına Sok' }
];

export default {
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  data: new SlashCommandBuilder()
    .setName('rol-inceleme')
    .setDescription('Bir rolün üye sayısı ve kritik izinlerini özetler.')
    .addRoleOption((option) => option.setName('rol').setDescription('İncelenecek rol').setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const role = interaction.options.getRole('rol');
    if (!role) {
      await interaction.reply({ content: 'İncelenecek bir rol seçmelisin.', ephemeral: true });
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

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
