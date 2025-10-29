import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { formatUserMention, sendModerationLog } from '../../utils/modLog.js';

export default {
  category: 'Moderasyon',
  data: new SlashCommandBuilder()
    .setName('kanal-kilit')
    .setDescription('Kanalin kilit durumunu degistirir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((option) =>
      option
        .setName('kanal')
        .setDescription('Kilitlenecek kanal (varsayilan: mevcut kanal)')
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName('kilitle')
        .setDescription('True secilirse kanal kilitlenir, false secilirse acilir.')
        .setRequired(true)
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut sadece sunucularda kullanilabilir.', ephemeral: true });
      return;
    }

    const channel = interaction.options.getChannel('kanal') ?? interaction.channel;
    const lock = interaction.options.getBoolean('kilitle');

    if (!channel?.isTextBased() || channel.isDMBased()) {
      await interaction.reply({ content: 'Kanal sadece metin tabanliysa kilitlenebilir.', ephemeral: true });
      return;
    }

    const everyoneRole = interaction.guild.roles.everyone;

    await channel.permissionOverwrites.edit(everyoneRole, {
      SendMessages: lock ? false : null
    });

    const message = lock ? `🔒 ${channel} kanali kilitlendi.` : `🔓 ${channel} kanali artik mesajlara acik.`;

    await interaction.reply({
      content: message,
      ephemeral: true
    });

    await sendModerationLog(interaction.client, interaction.guildId, {
      action: 'Kanal Kilidi',
      moderator: formatUserMention(interaction.user),
      reason: lock ? 'Kanal mesaj gonderimine kapatildi.' : 'Kanal kilidi kaldirildi.',
      color: lock ? 0xc0392b : 0x27ae60,
      extraFields: [
        { name: 'Kanal', value: channel.toString(), inline: true },
        { name: 'Durum', value: lock ? 'Kilitli' : 'Acik', inline: true }
      ]
    });
  }
};
