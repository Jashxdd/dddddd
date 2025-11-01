import { SlashCommandBuilder, EmbedBuilder, time } from 'discord.js';

export default {
  category: 'Genel',
  data: new SlashCommandBuilder()
    .setName('kullanici-bilgi')
    .setDescription('Bir kullanici hakkinda detayli bilgiler gosterir.')
    .addUserOption((option) =>
      option
        .setName('kullanici')
        .setDescription('Bilgilerini görmek istedigin kisi')
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('kullanici') ?? interaction.user;

    let member = null;
    if (interaction.guild) {
      try {
        member = await interaction.guild.members.fetch(user.id);
      } catch (error) {
        member = null;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(member?.displayHexColor && member.displayHexColor !== '#000000' ? Number(member.displayHexColor.replace('#', '0x')) : 0x3498db)
      .setAuthor({ name: `${user.username}`, iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL({ size: 512 }))
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Bot mu?', value: user.bot ? 'Evet' : 'Hayir', inline: true },
        { name: 'Hesap Olusma', value: time(Math.floor(user.createdTimestamp / 1000), 'F'), inline: false }
      );

    if (member) {
      embed.addFields(
        { name: 'Sunucuya Katilim', value: member.joinedTimestamp ? time(Math.floor(member.joinedTimestamp / 1000), 'F') : 'Bilinmiyor', inline: false },
        {
          name: 'Roller',
          value:
            member.roles.cache
              .filter((role) => role.id !== interaction.guild?.id)
              .map((role) => role.toString())
              .join(' ') || 'Rol bulunmuyor',
          inline: false
        },
        { name: 'En Yuksek Rol', value: member.roles.highest?.toString() ?? 'Yok', inline: true }
      );
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
