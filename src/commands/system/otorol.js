import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { addAutoRole, clearAutoRoles, describeAutoRoles, hasAutoRole, removeAutoRole } from '../../utils/autoRoleStorage.js';

function ensureManageableRole(interaction, role) {
  if (!role) {
    return { ok: false, message: 'Rol bulunamadı veya geçici olarak erişilemiyor.' };
  }

  const me = interaction.guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return { ok: false, message: 'Bu sunucuda rol yönetme yetkim bulunmuyor.' };
  }

  if (me.roles.highest.comparePositionTo(role) <= 0) {
    return {
      ok: false,
      message: `${role} rolünü veremiyorum. Yetkilerimde bu rolden daha yüksek bir rol olmalı.`
    };
  }

  return { ok: true };
}

export default {
  category: 'Sistem',
  menuGroup: 'Sistemler',
  catalogKey: 'otorol',
  data: new SlashCommandBuilder()
    .setName('otorol')
    .setDescription('Sunucuya katılan üyelere otomatik rol verme sistemini yönetir.')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('ekle')
        .setDescription('Yeni üyeler katıldığında otomatik verilecek bir rol ekler.')
        .addRoleOption((option) =>
          option
            .setName('rol')
            .setDescription('Sunucuya katılanlara otomatik atanacak rol')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('kaldir')
        .setDescription('Otomatik rol listesinden bir rolü kaldırır.')
        .addRoleOption((option) =>
          option
            .setName('rol')
            .setDescription('Listeden kaldırılacak rol')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('liste').setDescription('Aktif otomatik rollerin listesini gösterir.')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('sifirla').setDescription('Otomatik rol listesini tamamen sıfırlar.')
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'liste') {
      const summary = await describeAutoRoles(interaction.guildId, interaction.guild);
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🔁 Otomatik Roller')
        .setDescription('Sunucuya yeni katılan üyelere atanan rollerin özeti:')
        .addFields({ name: 'Durum', value: summary.mentionList })
        .setFooter({ text: `${interaction.client.user.username} • Otorol` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (subcommand === 'sifirla') {
      await clearAutoRoles(interaction.guildId);
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('♻️ Otorol Sıfırlandı')
        .setDescription('Otomatik rol listesi temizlendi. Artık yeni roller ekleyene kadar kimseye rol atanmayacak.')
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const role = interaction.options.getRole('rol', true);
    const check = ensureManageableRole(interaction, role);
    if (!check.ok) {
      await interaction.reply({ content: `⚠️ ${check.message}`, ephemeral: true });
      return;
    }

    if (subcommand === 'ekle') {
      if (await hasAutoRole(interaction.guildId, role.id)) {
        await interaction.reply({ content: `ℹ️ ${role} zaten otomatik rol listesinde.`, ephemeral: true });
        return;
      }

      await addAutoRole(interaction.guildId, role.id);

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Rol Eklendi')
        .setDescription(`${role} artık sunucuya katılan üyelere otomatik atanacak.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (subcommand === 'kaldir') {
      if (!(await hasAutoRole(interaction.guildId, role.id))) {
        await interaction.reply({ content: `ℹ️ ${role} otomatik rol listesinde bulunmuyor.`, ephemeral: true });
        return;
      }

      const remaining = await removeAutoRole(interaction.guildId, role.id);
      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🗑️ Rol Kaldırıldı')
        .setDescription(`${role} otomatik rol listesinden çıkarıldı.`)
        .addFields({ name: 'Kalan Roller', value: remaining.length ? remaining.map((id) => `<@&${id}>`).join(', ') : 'Liste boş.' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    await interaction.reply({ content: 'Bilinmeyen alt komut.', ephemeral: true });
  }
};
