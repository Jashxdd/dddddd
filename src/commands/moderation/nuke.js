import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { formatUserMention, sendModerationLog } from '../../utils/modLog.js';

const SUPPORTED_CHANNEL_TYPES = new Set([ChannelType.GuildText, ChannelType.GuildAnnouncement]);

function isSupportedChannel(channel) {
  return Boolean(channel && SUPPORTED_CHANNEL_TYPES.has(channel.type));
}

export default {
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  deferEphemeral: true,
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Bir kanalı temizleyip yeni bir kopyasını oluşturur.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName('kanal')
        .setDescription('Yenilenecek kanalı seç')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    )
    .addStringOption((option) =>
      option
        .setName('sebep')
        .setDescription('Kanalın neden yenilendiğini açıklayın')
        .setMaxLength(200)
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'Bu komut yalnızca sunucularda kullanılabilir.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const guild = interaction.guild;
    const me = guild?.members?.me;

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: 'Bu komutu kullanmak için **Kanalları Yönet** yetkisine sahip olmalısın.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (!me?.permissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: 'Kanalları yenilemek için yeterli iznim bulunmuyor. Lütfen yetkilerimi kontrol edin.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const providedChannel = interaction.options.getChannel('kanal');
    const targetChannel = (providedChannel ?? interaction.channel);

    if (!targetChannel || targetChannel.isThread?.()) {
      await interaction.reply({
        content: 'Kanal bulunamadı veya desteklenmeyen bir kanal türü seçildi.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (!isSupportedChannel(targetChannel)) {
      await interaction.reply({
        content: 'Bu komut yalnızca metin ve duyuru kanallarında kullanılabilir.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const reason = interaction.options.getString('sebep')?.trim() || 'Sebep belirtilmedi';

    let clonedChannel = null;
    try {
      clonedChannel = await targetChannel.clone({ reason: `Furmin nuke: ${reason}` });

      if (targetChannel.parentId && clonedChannel.parentId !== targetChannel.parentId) {
        await clonedChannel.setParent(targetChannel.parentId, { lockPermissions: false }).catch(() => null);
      }

      await clonedChannel.setPosition(targetChannel.position).catch(() => null);

      if ('topic' in targetChannel && targetChannel.topic && 'setTopic' in clonedChannel) {
        await clonedChannel.setTopic(targetChannel.topic).catch(() => null);
      }

      await targetChannel.delete(reason).catch((error) => {
        throw Object.assign(new Error('DELETE_FAILED'), { cause: error });
      });

      await clonedChannel.send({
        content: `🧨 Kanal temizlendi. Lütfen kurallara uyarak sohbet etmeye devam edelim. Bu işlemi ${interaction.user} gerçekleştirdi.`,
        allowedMentions: { users: [], roles: [] }
      }).catch(() => null);

      await interaction.editReply({
        content: `🧹 ${clonedChannel} kanalı başarıyla yenilendi.`
      });

      await sendModerationLog(interaction.client, interaction.guildId, {
        action: 'Kanal Yenileme',
        moderator: formatUserMention(interaction.user),
        target: `${targetChannel.name} ➜ ${clonedChannel}`,
        reason,
        color: 0xe67e22,
        extraFields: [
          { name: 'Eski Kanal', value: `${targetChannel.name} (${targetChannel.id})`, inline: true },
          { name: 'Yeni Kanal', value: `${clonedChannel} (${clonedChannel.id})`, inline: true }
        ]
      });
    } catch (error) {
      if (clonedChannel && clonedChannel.deletable) {
        await clonedChannel.delete('Nuke işlemi başarısız olduğu için temizlendi.').catch(() => null);
      }

      console.error('Kanal yenilenirken hata oluştu:', error);
      await interaction.editReply({
        content: '⚠️ Kanal yenilenirken bir hata oluştu. Lütfen yetkileri ve kanal durumunu kontrol edin.'
      });
    }
  }
};
