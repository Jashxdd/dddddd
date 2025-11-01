import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import {
  clearModLogChannelId,
  getModLogChannelId,
  setModLogChannelId
} from '../../utils/modLogStorage.js';
import { sendModerationLog } from '../../utils/modLog.js';

const REQUIRED_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks
];

export default {
  category: 'Sistem',
  data: new SlashCommandBuilder()
    .setName('modlog')
    .setDescription('Moderasyon log kanalını ayarlar ve test eder.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('ayarla')
        .setDescription('Mod-log mesajlarının gönderileceği kanalı belirler.')
        .addChannelOption((option) =>
          option
            .setName('kanal')
            .setDescription('Mod-log için kullanılacak metin kanalı')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) => sub.setName('kaldir').setDescription('Kayıtlı mod-log kanalını sıfırlar.'))
    .addSubcommand((sub) => sub.setName('goster').setDescription('Aktif mod-log kanalını gösterir.'))
    .addSubcommand((sub) => sub.setName('test').setDescription('Mod-log kanalına test mesajı gönderir.')),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'ayarla') {
      const channel = interaction.options.getChannel('kanal', true);

      if (!channel?.isTextBased() || channel.isDMBased()) {
        await interaction.reply({ content: 'Lütfen metin tabanlı bir kanal seçin.', ephemeral: true });
        return;
      }

      const me = interaction.guild.members.me;
      const permissions = channel.permissionsFor(me);

      if (!permissions?.has(REQUIRED_PERMISSIONS)) {
        await interaction.reply({
          content:
            'Bu kanala mesaj gönderebilmek için **Mesaj Gönder**, **Kanalı Görüntüle** ve **Bağlantıları Yerleşik Olarak Göster** izinlerine ihtiyacım var.',
          ephemeral: true
        });
        return;
      }

      await setModLogChannelId(interaction.guildId, channel.id);
      await interaction.reply({ content: `✅ Mod-log kanalı ${channel} olarak ayarlandı.`, ephemeral: true });

      const sent = await sendModerationLog(interaction.client, interaction.guildId, {
        action: 'Mod-Log Ayarlandı',
        moderatorUser: interaction.user,
        description: 'Mod-log kanalı başarıyla güncellendi.',
        color: 0x2ecc71,
        extraFields: [
          { name: 'Kanal', value: channel.toString(), inline: true },
          { name: 'Sunucu', value: interaction.guild.name, inline: true }
        ]
      });

      if (!sent) {
        await interaction.followUp({
          content:
            '⚠️ Mod-log kanalına test mesajı gönderilemedi. Kanala erişim iznimi ve kanal tipini kontrol edin.',
          ephemeral: true
        });
      }

      return;
    }

    if (subcommand === 'kaldir') {
      const removed = await clearModLogChannelId(interaction.guildId);
      await interaction.reply({
        content: removed ? '🗑️ Mod-log kanalı sıfırlandı.' : 'ℹ️ Bu sunucu için kayıtlı mod-log kanalı bulunmuyor.',
        ephemeral: true
      });
      return;
    }

    if (subcommand === 'goster') {
      const channelId = await getModLogChannelId(interaction.guildId);
      if (!channelId) {
        await interaction.reply({ content: 'ℹ️ Bu sunucu için kayıtlı bir mod-log kanalı bulunmuyor.', ephemeral: true });
        return;
      }

      const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        await clearModLogChannelId(interaction.guildId);
        await interaction.reply({
          content: '⚠️ Kayıtlı kanal bulunamadı. Mod-log ayarını yeniden yapmanız gerekiyor.',
          ephemeral: true
        });
        return;
      }

      await interaction.reply({ content: `📍 Güncel mod-log kanalı: ${channel}`, ephemeral: true });
      return;
    }

    if (subcommand === 'test') {
      await interaction.deferReply({ ephemeral: true });
      const success = await sendModerationLog(interaction.client, interaction.guildId, {
        action: 'Mod-Log Testi',
        moderatorUser: interaction.user,
        description: 'Bu mesaj mod-log ayarlarınızın doğrulanması için gönderildi.',
        color: 0x3498db
      });

      await interaction.editReply({
        content: success
          ? '✅ Test mesajı mod-log kanalına gönderildi.'
          : '⚠️ Mod-log kanalına mesaj gönderilemedi. Lütfen kanal ayarlarını kontrol edin.'
      });
    }
  }
};
