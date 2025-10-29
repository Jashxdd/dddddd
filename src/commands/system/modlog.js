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
    .setDescription('Moderasyon log kanalini ayarlar ve test eder.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('ayarla')
        .setDescription('Mod-log mesajlarinin gonderilecegi kanali belirler.')
        .addChannelOption((option) =>
          option
            .setName('kanal')
            .setDescription('Mod-log icin kullanilacak metin kanali')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) => sub.setName('kaldir').setDescription('Kayitli mod-log kanalini sifirlar.'))
    .addSubcommand((sub) => sub.setName('goster').setDescription('Aktif mod-log kanalini gosterir.'))
    .addSubcommand((sub) => sub.setName('test').setDescription('Mod-log kanalina test mesaji gonderir.')),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut sadece sunucularda kullanilabilir.', ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'ayarla') {
      const channel = interaction.options.getChannel('kanal', true);

      if (!channel?.isTextBased() || channel.isDMBased()) {
        await interaction.reply({ content: 'Lutfen metin tabanli bir kanal secin.', ephemeral: true });
        return;
      }

      const me = interaction.guild.members.me;
      const permissions = channel.permissionsFor(me);

      if (!permissions?.has(REQUIRED_PERMISSIONS)) {
        await interaction.reply({
          content:
            'Bu kanala mesaj gonderebilmek icin **Mesaj Gonder**, **Kanalı Görüntüle** ve **Baglantilari Yerlesik Olarak Goster** izinlerime ihtiyac var.',
          ephemeral: true
        });
        return;
      }

      await setModLogChannelId(interaction.guildId, channel.id);
      await interaction.reply({ content: `✅ Mod-log kanali ${channel} olarak ayarlandi.`, ephemeral: true });

      const sent = await sendModerationLog(interaction.client, interaction.guildId, {
        action: 'Mod-Log Ayarlandı',
        moderatorUser: interaction.user,
        description: 'Mod-log kanali basariyla guncellendi.',
        color: 0x2ecc71,
        extraFields: [
          { name: 'Kanal', value: channel.toString(), inline: true },
          { name: 'Sunucu', value: interaction.guild.name, inline: true }
        ]
      });

      if (!sent) {
        await interaction.followUp({
          content:
            '⚠️ Mod-log kanalina test mesaji gonderilemedi. Kanala erisim iznimi ve kanal tipini kontrol edin.',
          ephemeral: true
        });
      }

      return;
    }

    if (subcommand === 'kaldir') {
      const removed = await clearModLogChannelId(interaction.guildId);
      await interaction.reply({
        content: removed ? '🗑️ Mod-log kanali sifirlandi.' : 'ℹ️ Bu sunucu icin kayitli mod-log kanali bulunmuyor.',
        ephemeral: true
      });
      return;
    }

    if (subcommand === 'goster') {
      const channelId = await getModLogChannelId(interaction.guildId);
      if (!channelId) {
        await interaction.reply({ content: 'ℹ️ Bu sunucu icin kayitli bir mod-log kanali bulunmuyor.', ephemeral: true });
        return;
      }

      const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        await clearModLogChannelId(interaction.guildId);
        await interaction.reply({
          content: '⚠️ Kayitli kanal bulunamadi. Mod-log ayarini yeniden yapmaniz gerekiyor.',
          ephemeral: true
        });
        return;
      }

      await interaction.reply({ content: `📍 Guncel mod-log kanali: ${channel}`, ephemeral: true });
      return;
    }

    if (subcommand === 'test') {
      await interaction.deferReply({ ephemeral: true });
      const success = await sendModerationLog(interaction.client, interaction.guildId, {
        action: 'Mod-Log Testi',
        moderatorUser: interaction.user,
        description: 'Bu mesaj mod-log ayarlarinizin dogrulanmasi icin gonderildi.',
        color: 0x3498db
      });

      await interaction.editReply({
        content: success
          ? '✅ Test mesaji mod-log kanalina gonderildi.'
          : '⚠️ Mod-log kanalina mesaj gonderilemedi. Lutfen kanal ayarlarini kontrol edin.'
      });
    }
  }
};
