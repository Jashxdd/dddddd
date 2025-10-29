import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  category: 'Moderasyon',
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bir uyeyi sunucudan yasaklar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName('uye')
        .setDescription('Yasaklanacak uyenin secimi')
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

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({
        content: 'Uyelere ban atabilmem icin yetkim yok.',
        ephemeral: true
      });
      return;
    }

    if (!member.bannable) {
      await interaction.reply({
        content: 'Bu uyeyi yasaklayamiyorum. Rollerimi kontrol edin.',
        ephemeral: true
      });
      return;
    }

    await member.ban({ reason });

    await interaction.reply({
      content: `${member.user.tag} kullanicisi yasaklandi. Sebep: ${reason}`
    });
  }
};
