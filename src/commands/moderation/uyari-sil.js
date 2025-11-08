import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } from 'discord.js';
import { listWarnings, removeWarning } from '../../utils/warnStorage.js';
import { sendModerationLog } from '../../utils/modLog.js';

export default {
  category: 'Moderasyon',
  menuGroup: 'Denetim',
  deferEphemeral: true,
  data: new SlashCommandBuilder()
    .setName('uyari-sil')
    .setDescription('Belirtilen üyenin uyarılarından birini kaldırır.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName('uye')
        .setDescription('Uyarısı silinecek üye')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('numara')
        .setDescription('Silinecek uyarının sıra numarası (1, 2, 3...)')
        .setRequired(true)
        .setMinValue(1)
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('uye', true);
    const indexInput = interaction.options.getInteger('numara', true);
    const warnings = await listWarnings(interaction.guildId, target.id);

    if (!warnings.length) {
      await interaction.editReply({ content: 'ℹ️ Bu üyenin kayıtlı uyarısı bulunmuyor.' });
      return;
    }

    const warnIndex = indexInput - 1;
    const entry = warnings[warnIndex];
    if (!entry) {
      await interaction.editReply({ content: '⚠️ Belirttiğin numaraya ait bir uyarı bulunamadı.' });
      return;
    }

    const removed = await removeWarning(interaction.guildId, target.id, warnIndex);
    if (!removed) {
      await interaction.editReply({ content: '⚠️ Uyarı silinirken bir sorun oluştu. Lütfen tekrar dene.' });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('⚠️ Uyarı Silindi')
      .setDescription(`${target} kullanıcısının ${indexInput}. uyarısı kaldırıldı.`)
      .addFields(
        { name: 'Kullanıcı', value: `${target.tag} (${target.id})`, inline: true },
        { name: 'Moderasyon', value: interaction.user.tag, inline: true },
        { name: 'Önceki Sebep', value: entry.reason ?? 'Belirtilmemiş' }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    await sendModerationLog(interaction.client, interaction.guildId, {
      action: 'Uyarı Silindi',
      targetUser: target,
      moderator: interaction.user,
      color: 0xf1c40f,
      description: `${interaction.user} kullanıcısı ${target} için bir uyarıyı kaldırdı.`,
      extraFields: [
        { name: 'Silinen Uyarı', value: `${indexInput}. kayıt` },
        { name: 'Önceki Sebep', value: entry.reason ?? 'Belirtilmemiş' }
      ]
    });
  }
};
