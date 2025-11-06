import { ChannelType, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { config } from '../../config.js';

export default {
  category: 'Sistem',
  menuGroup: 'Sahip Araçları',
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('sahip-duyuru')
    .setDescription('Bot sahibinin seçilen kanala şık bir duyuru göndermesini sağlar.')
    .addChannelOption((option) =>
      option
        .setName('kanal')
        .setDescription('Duyurunun gönderileceği kanal')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('mesaj')
        .setDescription('Duyuruda yer alacak ana metin')
        .setMinLength(10)
        .setMaxLength(1024)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('baslik')
        .setDescription('Duyuru başlığı (isteğe bağlı)')
        .setMaxLength(150)
    )
    .addBooleanOption((option) =>
      option
        .setName('herkesi-etiketle')
        .setDescription('@everyone etiketlensin mi?')
    ),
  async execute(interaction) {
    if (interaction.user.id !== interaction.client.ownerId) {
      await interaction.reply({
        content: '⭐ Bu komut yalnızca bot sahibi tarafından kullanılabilir.',
        ephemeral: true
      });
      return;
    }

    const channel = interaction.options.getChannel('kanal', true);
    const content = interaction.options.getString('mesaj', true);
    const title = interaction.options.getString('baslik') ?? 'Furmin Duyurusu';
    const mentionEveryone = interaction.options.getBoolean('herkesi-etiketle') ?? false;

    if (!channel.isTextBased()) {
      await interaction.reply({ content: 'Seçilen kanala mesaj gönderilemiyor.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(title)
      .setDescription(content)
      .setFooter({ text: `Gönderen: ${interaction.user.tag}` })
      .setTimestamp();

    if (config.inviteUrl) {
      embed.setURL(config.inviteUrl);
    }

    const mention = mentionEveryone ? '@everyone' : null;

    await channel.send({
      content: mention ?? undefined,
      embeds: [embed],
      allowedMentions: { parse: mentionEveryone ? ['everyone'] : [] }
    });

    await interaction.reply({
      content: `📣 Duyuru **${channel}** kanalına gönderildi.`,
      ephemeral: true
    });
  }
};
