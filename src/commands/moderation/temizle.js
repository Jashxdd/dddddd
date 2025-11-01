import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { formatUserMention, sendModerationLog } from '../../utils/modLog.js';

export default {
  category: 'Moderasyon',
  data: new SlashCommandBuilder()
    .setName('temizle')
    .setDescription('Kanaldaki son mesajları toplu olarak siler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName('adet')
        .setDescription('Silinecek mesaj sayısı (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName('kullanici')
        .setDescription('Sadece belirtilen kullanıcının mesajlarını sil')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'Bu komut sadece sunucu içinde kullanılabilir.',
        ephemeral: true
      });
      return;
    }

    const amount = interaction.options.getInteger('adet', true);
    const targetUser = interaction.options.getUser('kullanici');

    const channel = interaction.channel;

    if (!channel?.isTextBased() || channel.isDMBased()) {
      await interaction.reply({ content: 'Bu komut sadece metin kanallarında kullanılabilir.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    let deleted;
    try {
      if (targetUser) {
        const messages = await channel.messages.fetch({ limit: 100 });
        const filtered = messages.filter((msg) => msg.author.id === targetUser.id).first(amount);
        deleted = await channel.bulkDelete(filtered, true);
      } else {
        deleted = await channel.bulkDelete(amount, true);
      }
    } catch (error) {
      await interaction.editReply({ content: '⚠️ Mesajlar silinirken bir hata oluştu. Bazı mesajlar 14 günden eski olabilir.' });
      return;
    }

    const deletedCount = deleted?.size ?? 0;

    await interaction.editReply({
      content: deletedCount ? `🧹 Toplam ${deletedCount} mesaj silindi.` : '⚠️ Silinecek mesaj bulunamadı.'
    });

    if (deletedCount) {
      const extraFields = [
        { name: 'Kanal', value: channel.toString(), inline: true },
        { name: 'Silinen Mesaj Sayısı', value: String(deletedCount), inline: true }
      ];

      if (targetUser) {
        extraFields.push({ name: 'Hedef Kullanıcı', value: formatUserMention(targetUser), inline: true });
      }

      await sendModerationLog(interaction.client, interaction.guildId, {
        action: 'Mesaj Temizleme',
        moderator: formatUserMention(interaction.user),
        reason: targetUser
          ? 'Belirtilen kullanıcının mesajları filtrelenerek silindi.'
          : 'Kanaldaki mesajlar toplu olarak temizlendi.',
        color: 0x2980b9,
        extraFields
      });
    }
  }
};
