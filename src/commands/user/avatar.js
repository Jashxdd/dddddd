import { SlashCommandBuilder } from 'discord.js';

export default {
  category: 'Kullanici',
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Bir kullanicinin avatarini gosterir.')
    .addUserOption((option) =>
      option
        .setName('kullanici')
        .setDescription('Avatarini gormek istediginiz kisi')
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('kullanici') ?? interaction.user;
    const avatarUrl = user.displayAvatarURL({ size: 512, extension: 'png' });

    await interaction.reply({
      content: `${user.tag} kullanicisinin avatarı: ${avatarUrl}`
    });
  }
};
