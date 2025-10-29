import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  category: 'Genel',
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Belirtilen kullanicinin avatarini gosterir.')
    .addUserOption((option) =>
      option
        .setName('kullanici')
        .setDescription('Avatarini gormek istedigin kisi')
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('kullanici') ?? interaction.user;

    const avatarUrl = user.displayAvatarURL({ size: 2048 });

    const embed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setAuthor({ name: `${user.username} (${user.id})` })
      .setTitle('🖼️ Avatar Onizlemesi')
      .setImage(avatarUrl)
      .setFooter({ text: 'Sag tiklayarak farkli boyutlarda kaydedebilirsin.' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
