import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { formatUserMention, sendModerationLog } from '../../utils/modLog.js';

export default {
  category: 'Moderasyon',
  data: new SlashCommandBuilder()
    .setName('sustur-kaldir')
    .setDescription('Zaman aşımına sokulmuş bir kullanıcının susturmasını kaldırır.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName('kullanici')
        .setDescription('Susturması kaldırılacak kullanıcı')
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
        content: 'Bu komut sadece sunucu içinde kullanılabilir.',
        ephemeral: true
      });
      return;
    }

    const target = interaction.options.getMember('kullanici');
    if (!target) {
      await interaction.reply({ content: 'Belirtilen kullanıcı sunucuda bulunamadı.', ephemeral: true });
      return;
    }

    if (!target.isCommunicationDisabled()) {
      await interaction.reply({
        content: 'Bu kullanıcı şu anda susturulmuş değil.',
        ephemeral: true
      });
      return;
    }

    if (!target.moderatable || target.roles.highest.comparePositionTo(interaction.member.roles.highest) >= 0) {
      await interaction.reply({ content: 'Bu kullanıcının susturmasını kaldıramazsın.', ephemeral: true });
      return;
    }

    const reason = interaction.options.getString('sebep') ?? 'Sebep belirtilmedi';

    await target.timeout(null, reason);

    await interaction.reply({ content: `🔊 ${target.user.tag} kullanıcısının susturması kaldırıldı.`, ephemeral: true });

    await sendModerationLog(interaction.client, interaction.guildId, {
      action: 'Zaman Aşımı Kaldırıldı',
      target: formatUserMention(target.user),
      moderator: formatUserMention(interaction.user),
      reason,
      color: 0x27ae60
    });
  }
};
