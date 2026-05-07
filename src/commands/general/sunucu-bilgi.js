import { SlashCommandBuilder, EmbedBuilder, time } from 'discord.js';

export default {
  category: 'Genel',
  data: new SlashCommandBuilder().setName('sunucu-bilgi').setDescription('Sunucu hakkinda özet bilgi verir.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komutu sadece sunucularda kullanabilirsin.', ephemeral: true });
      return;
    }

    const { guild } = interaction;
    await guild.fetch();

    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle(`🏛️ ${guild.name}`)
      .addFields(
        { name: 'Sunucu ID', value: guild.id, inline: true },
        { name: 'Sahip', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Olusma', value: time(Math.floor(guild.createdTimestamp / 1000), 'F'), inline: false },
        { name: 'Uye Sayisi', value: `${guild.memberCount}`, inline: true },
        { name: 'Metin Kanallari', value: `${guild.channels.cache.filter((ch) => ch.isTextBased()).size}`, inline: true },
        { name: 'Ses Kanallari', value: `${guild.channels.cache.filter((ch) => ch.isVoiceBased()).size}`, inline: true },
        { name: 'Boost Seviyesi', value: `${guild.premiumTier}`, inline: true },
        { name: 'Boost Sayisi', value: `${guild.premiumSubscriptionCount ?? 0}`, inline: true }
      )
      .setFooter({ text: `Bölge: ${guild.preferredLocale}` });

    const icon = guild.iconURL({ size: 512 });
    if (icon) {
      embed.setThumbnail(icon);
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
