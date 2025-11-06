import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

function formatDate(date, locale = 'tr-TR', options = {}) {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export default {
  category: 'Genel',
  data: new SlashCommandBuilder()
    .setName('sunucu-saat')
    .setDescription('Türkiye saati ve UTC bilgilerini gösterir.'),
  async execute(interaction) {
    const now = new Date();

    const istanbulTime = formatDate(now, 'tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Istanbul'
    });

    const utcTime = formatDate(now, 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    });

    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle('⏰ Anlık Saat Bilgisi')
      .setDescription('Türkiye saati ile koordineli dünya saati (UTC) karşılaştırması.')
      .addFields(
        { name: 'Türkiye (Europe/Istanbul)', value: `🕒 ${istanbulTime}` },
        { name: 'UTC', value: `🌍 ${utcTime}` },
        {
          name: 'Unix Zaman Damgası',
          value: `
<t:${Math.floor(now.getTime() / 1000)}:F>
<t:${Math.floor(now.getTime() / 1000)}:R>
          `.trim()
        }
      )
      .setFooter({ text: `${interaction.client.user.username} • Saat asistanı` })
      .setTimestamp(now);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
