import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { formatUserMention, sendModerationLog } from '../../utils/modLog.js';

const durations = [
  { name: 'Kapat', value: 0 },
  { name: '5 saniye', value: 5 },
  { name: '10 saniye', value: 10 },
  { name: '15 saniye', value: 15 },
  { name: '30 saniye', value: 30 },
  { name: '1 dakika', value: 60 },
  { name: '2 dakika', value: 120 },
  { name: '5 dakika', value: 300 }
];

export default {
  category: 'Moderasyon',
  data: new SlashCommandBuilder()
    .setName('yavas-mod')
    .setDescription('Metin kanalındaki yavaş mod ayarını değiştirir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((option) => {
      let builder = option
        .setName('sure')
        .setDescription('Yavaş mod süre seçimi')
        .setRequired(true);

      for (const duration of durations) {
        builder = builder.addChoices({ name: duration.name, value: String(duration.value) });
      }

      return builder;
    })
    .addChannelOption((option) =>
      option
        .setName('kanal')
        .setDescription('Yavaş mod uygulanacak kanal (varsayılan: mevcut kanal)')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'Bu komut sadece sunucularda kullanılabilir.',
        ephemeral: true
      });
      return;
    }

    const channel = interaction.options.getChannel('kanal') ?? interaction.channel;

    if (!channel?.isTextBased() || channel.isDMBased() || typeof channel.setRateLimitPerUser !== 'function') {
      await interaction.reply({ content: 'Yavaş mod sadece metin kanallarında ayarlanabilir.', ephemeral: true });
      return;
    }

    const seconds = Number(interaction.options.getString('sure'));

    await channel.setRateLimitPerUser(seconds, `Yavaş mod ${interaction.user.tag} tarafından güncellendi`);

    const messageContent =
      seconds === 0
        ? `⏹️ ${channel} kanalındaki yavaş mod kapatıldı.`
        : `🐢 ${channel} kanalındaki yavaş mod ${seconds} saniye olarak ayarlandı.`;

    await interaction.reply({
      content: messageContent,
      ephemeral: true
    });

    await sendModerationLog(interaction.client, interaction.guildId, {
      action: 'Yavaş Mod',
      moderator: formatUserMention(interaction.user),
      reason:
        seconds === 0 ? 'Kanal için yavaş mod devre dışı bırakıldı.' : 'Kanalın yavaş mod süresi güncellendi.',
      color: 0x9b59b6,
      extraFields: [
        { name: 'Kanal', value: channel.toString(), inline: true },
        { name: 'Süre', value: seconds === 0 ? 'Pasif' : `${seconds} saniye`, inline: true }
      ]
    });
  }
};
