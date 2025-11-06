import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { formatUserMention, sendModerationLog } from '../../utils/modLog.js';

export default {
  category: 'Moderasyon',
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Bir üyeyi sunucudan atar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName('uye')
        .setDescription('Atılacak üyenin seçimi')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('sebep')
        .setDescription('Atma sebebi')
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

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
      await interaction.reply({
        content: 'Üyelere kick atabilmem için yetkim yok.',
        ephemeral: true
      });
      return;
    }

    if (!member.kickable) {
      await interaction.reply({
        content: 'Bu üyeyi atamıyorum. Rollerimi kontrol edin.',
        ephemeral: true
      });
      return;
    }

    await member.kick(reason);

    await interaction.reply({
      content: `${member.user.tag} kullanıcısı sunucudan atıldı. Sebep: ${reason}`
    });

    await sendModerationLog(interaction.client, interaction.guildId, {
      action: 'Kick',
      target: formatUserMention(member.user),
      moderator: formatUserMention(interaction.user),
      reason,
      color: 0xe67e22
    });
  }
};
