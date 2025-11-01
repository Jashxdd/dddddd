import { SlashCommandBuilder, EmbedBuilder, parseEmoji } from 'discord.js';

export default {
  category: 'Genel',
  data: new SlashCommandBuilder()
    .setName('emoji-bilgi')
    .setDescription('Bir emojinin detaylarini gosterir.')
    .addStringOption((option) =>
      option
        .setName('emoji')
        .setDescription('Bilgilerini gormek istedigin emoji')
        .setRequired(true)
    ),
  async execute(interaction) {
    const emojiInput = interaction.options.getString('emoji', true);
    const parsed = parseEmoji(emojiInput);

    if (!parsed) {
      await interaction.reply({ content: 'Geçerli bir emoji girmelisin.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder().setColor(0xffd166);

    if (parsed.id) {
      const emoji = interaction.client.emojis.cache.get(parsed.id);
      const emojiUrl = emoji?.url ?? `https://cdn.discordapp.com/emojis/${parsed.id}.${parsed.animated ? 'gif' : 'png'}?size=512`;

      embed
        .setTitle('🧩 Özel Emoji Bilgisi')
        .setThumbnail(emojiUrl)
        .addFields(
          { name: 'Ad', value: parsed.name ?? 'Bilinmiyor', inline: true },
          { name: 'ID', value: parsed.id, inline: true },
          { name: 'Animasyon', value: parsed.animated ? 'Evet' : 'Hayir', inline: true },
          {
            name: 'Kullanım',
            value: emoji ? `${emoji}` : `\`:${parsed.name ?? 'emoji'}:\``,
            inline: false
          }
        );
    } else {
      embed
        .setTitle('🔡 Unicode Emoji Bilgisi')
        .setDescription(`${emojiInput}`)
        .addFields(
          {
            name: 'Unicode',
            value: [...emojiInput]
              .map((char) => `U+${char.codePointAt(0)?.toString(16).toUpperCase()}`)
              .join(' ')
          }
        );
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
