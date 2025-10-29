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
    .setDescription('Metin kanalindaki yavas mod ayarini degistirir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((option) =>
      option
        .setName('kanal')
        .setDescription('Yavas mod uygulanacak kanal (varsayilan: mevcut kanal)')
        .setRequired(false)
    )
    .addStringOption((option) => {
      let builder = option
        .setName('sure')
        .setDescription('Yavas mod sure secimi')
        .setRequired(true);

      for (const duration of durations) {
        builder = builder.addChoices({ name: duration.name, value: String(duration.value) });
      }

      return builder;
    }),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'Bu komut sadece sunucularda kullanilabilir.',
        ephemeral: true
      });
      return;
    }

    const channel = interaction.options.getChannel('kanal') ?? interaction.channel;

    if (!channel?.isTextBased() || channel.isDMBased() || typeof channel.setRateLimitPerUser !== 'function') {
      await interaction.reply({ content: 'Yavas mod sadece metin kanallarinda ayarlanabilir.', ephemeral: true });
      return;
    }

    const seconds = Number(interaction.options.getString('sure'));

    await channel.setRateLimitPerUser(seconds, `Yavas mod ${interaction.user.tag} tarafindan guncellendi`);

    const messageContent =
      seconds === 0
        ? `⏹️ ${channel} kanalindaki yavas mod kapatildi.`
        : `🐢 ${channel} kanalindaki yavas mod ${seconds} saniye olarak ayarlandi.`;

    await interaction.reply({
      content: messageContent,
      ephemeral: true
    });

    await sendModerationLog(interaction.client, interaction.guildId, {
      action: 'Yavas Mod',
      moderator: formatUserMention(interaction.user),
      reason:
        seconds === 0 ? 'Kanal icin yavas mod devre disi birakildi.' : 'Kanalin yavas mod suresi guncellendi.',
      color: 0x9b59b6,
      extraFields: [
        { name: 'Kanal', value: channel.toString(), inline: true },
        { name: 'Sure', value: seconds === 0 ? 'Pasif' : `${seconds} saniye`, inline: true }
      ]
    });
  }
};
