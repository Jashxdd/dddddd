import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  category: 'Genel',
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription('Belirtilen kullanicinin profil bannerini gosterir.')
    .addUserOption((option) =>
      option
        .setName('kullanici')
        .setDescription('Bannerini incelemek istedigin kisi')
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('kullanici') ?? interaction.user;
    const fetched = await user.fetch();

    const bannerUrl = fetched.bannerURL({ size: 2048 });

    if (!bannerUrl && !fetched.accentColor) {
      await interaction.reply({
        content: `${user} icin kayitli bir banner veya vurgu rengi bulunamadi.`,
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(fetched.accentColor ?? 0x5865f2)
      .setAuthor({ name: `${user.username} (${user.id})` })
      .setTitle('🎨 Profil Banneri');

    if (bannerUrl) {
      embed
        .setImage(bannerUrl)
        .setDescription('Banneri yeni sekmede acarak orijinal boyutta gorebilirsin.');
    } else {
      embed.setDescription('Bu kullanicinin banneri yok ancak vurgu rengi kayitli.');
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
