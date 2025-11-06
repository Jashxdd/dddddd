import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { formatUserMention, sendModerationLog } from '../../utils/modLog.js';

export default {
  category: 'Moderasyon',
  data: new SlashCommandBuilder()
    .setName('kanal-kilit')
    .setDescription('Kanalın kilit durumunu değiştirir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addBooleanOption((option) =>
      option
        .setName('kilitle')
        .setDescription('True seçilirse kanal kilitlenir, false seçilirse açılır.')
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName('kanal')
        .setDescription('Kilitlenecek kanal (varsayılan: mevcut kanal)')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const channel = interaction.options.getChannel('kanal') ?? interaction.channel;
    const lock = interaction.options.getBoolean('kilitle');

    if (!channel?.isTextBased() || channel.isDMBased()) {
      await interaction.reply({ content: 'Kanal sadece metin tabanlıysa kilitlenebilir.', ephemeral: true });
      return;
    }

    const everyoneRole = interaction.guild.roles.everyone;

    await channel.permissionOverwrites.edit(everyoneRole, {
      SendMessages: lock ? false : null
    });

    const message = lock ? `🔒 ${channel} kanalı kilitlendi.` : `🔓 ${channel} kanalı artık mesajlara açık.`;

    await interaction.reply({
      content: message,
      ephemeral: true
    });

    await sendModerationLog(interaction.client, interaction.guildId, {
      action: 'Kanal Kilidi',
      moderator: formatUserMention(interaction.user),
      reason: lock ? 'Kanal mesaj gönderimine kapatıldı.' : 'Kanal kilidi kaldırıldı.',
      color: lock ? 0xc0392b : 0x27ae60,
      extraFields: [
        { name: 'Kanal', value: channel.toString(), inline: true },
        { name: 'Durum', value: lock ? 'Kilitli' : 'Açık', inline: true }
      ]
    });
  }
};
