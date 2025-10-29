import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { formatUserMention, sendModerationLog } from '../../utils/modLog.js';

export default {
  category: 'Moderasyon',
  data: new SlashCommandBuilder()
    .setName('sustur-kaldir')
    .setDescription('Zaman asimina sokulmus bir kullanicinin susturmasini kaldirir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName('kullanici')
        .setDescription('Susturmasi kaldirilacak kullanici')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('sebep')
        .setDescription('Opsiyonel sebep mesajı')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'Bu komut sadece sunucu icinde kullanilabilir.',
        ephemeral: true
      });
      return;
    }

    const target = interaction.options.getMember('kullanici');
    if (!target) {
      await interaction.reply({ content: 'Belirtilen kullanici sunucuda bulunamadi.', ephemeral: true });
      return;
    }

    if (!target.isCommunicationDisabled()) {
      await interaction.reply({
        content: 'Bu kullanici su anda susturulmus degil.',
        ephemeral: true
      });
      return;
    }

    if (!target.moderatable || target.roles.highest.comparePositionTo(interaction.member.roles.highest) >= 0) {
      await interaction.reply({ content: 'Bu kullanicinin susturmasini kaldiramazsin.', ephemeral: true });
      return;
    }

    const reason = interaction.options.getString('sebep') ?? 'Sebep belirtilmedi';

    await target.timeout(null, reason);

    await interaction.reply({ content: `🔊 ${target.user.tag} kullanicisinin susturmasi kaldirildi.`, ephemeral: true });

    await sendModerationLog(interaction.client, interaction.guildId, {
      action: 'Zaman Asimi Kaldirildi',
      target: formatUserMention(target.user),
      moderator: formatUserMention(interaction.user),
      reason,
      color: 0x27ae60
    });
  }
};
