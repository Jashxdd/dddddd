import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  category: 'Moderasyon',
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Bir uyeyi sunucudan atar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName('uye')
        .setDescription('Atilacak uyenin secimi')
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
        content: 'Bu komut sadece sunucu icinde kullanilabilir.',
        ephemeral: true
      });
      return;
    }

    if (!member) {
      await interaction.reply({
        content: 'Belirtilen uye sunucuda bulunamadi.',
        ephemeral: true
      });
      return;
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
      await interaction.reply({
        content: 'Uyelere kick atabilmem icin yetkim yok.',
        ephemeral: true
      });
      return;
    }

    if (!member.kickable) {
      await interaction.reply({
        content: 'Bu uyeyi atamiyorum. Rollerimi kontrol edin.',
        ephemeral: true
      });
      return;
    }

    await member.kick(reason);

    await interaction.reply({
      content: `${member.user.tag} kullanicisi sunucudan atildi. Sebep: ${reason}`
    });
  }
};
