import { SlashCommandBuilder, EmbedBuilder, ActivityType } from 'discord.js';

export default {
  category: 'Genel',
  data: new SlashCommandBuilder()
    .setName('spotify')
    .setDescription('Bir kullanicinin Spotify uzerinde dinledigi sarkiyi gosterir.')
    .addUserOption((option) =>
      option
        .setName('kullanici')
        .setDescription('Takip etmek istedigin kisi (varsayilan olarak kendin)')
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komutu sadece sunucularda kullanabilirsin.', ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser('kullanici') ?? interaction.user;

    let member;
    try {
      member = await interaction.guild.members.fetch(targetUser.id);
    } catch (error) {
      await interaction.reply({ content: `${targetUser} bu sunucuda bulunmuyor.`, ephemeral: true });
      return;
    }

    const activity = member.presence?.activities.find(
      (act) => act.type === ActivityType.Listening && act.name === 'Spotify'
    );

    if (!activity) {
      await interaction.reply({ content: `${targetUser} su anda Spotify dinlemiyor.`, ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x1db954)
      .setTitle('🎧 Spotify Dinleniyor')
      .setDescription(`${targetUser} su sarkiyi dinliyor:`)
      .addFields(
        { name: 'Sanatci', value: activity.state ?? 'Bilinmiyor', inline: true },
        { name: 'Sarki', value: activity.details ?? 'Bilinmiyor', inline: true },
        { name: 'Album', value: activity.assets?.largeText ?? 'Belirtilmemis', inline: true }
      )
      .setFooter({ text: 'Spotify aktivitesi Discord uzerinden alindi.' });

    if (activity.assets?.largeImageURL()) {
      embed.setThumbnail(activity.assets.largeImageURL());
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
