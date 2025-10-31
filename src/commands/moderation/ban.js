import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { formatUserMention, sendModerationLog } from '../../utils/modLog.js';

export default {
  category: 'Moderasyon',
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bir üyeyi sunucudan yasaklar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName('uye')
        .setDescription('Yasaklanacak üyenin seçimi')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('sebep')
        .setDescription('Yasaklama sebebi')
        .setMaxLength(512)
    ),
  async execute(interaction) {
    const member = interaction.options.getMember('uye');
    const reason = interaction.options.getString('sebep') ?? 'Sebep belirtilmedi';

    if (!interaction.guild) {
      await interaction.reply({
        content: 'Bu komut sadece sunucu içinde kullanılabilir.',
        ephemeral: true
      });
      return;
    }

    if (!member) {
      await interaction.reply({
        content: 'Belirtilen üye sunucuda bulunamadı.',
        ephemeral: true
      });
      return;
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({
        content: 'Üyelere ban atabilmem için yetkim yok.',
        ephemeral: true
      });
      return;
    }

    if (!member.bannable) {
      await interaction.reply({
        content: 'Bu üyeyi yasaklayamıyorum. Rollerimi kontrol edin.',
        ephemeral: true
      });
      return;
    }

    await member.ban({ reason });

    await interaction.reply({
      content: `${member.user.tag} kullanıcısı yasaklandı. Sebep: ${reason}`
    });

    await sendModerationLog(interaction.client, interaction.guildId, {
      action: 'Ban',
      target: formatUserMention(member.user),
      moderator: formatUserMention(interaction.user),
      reason,
      color: 0xcb4335
    });
  }
};
