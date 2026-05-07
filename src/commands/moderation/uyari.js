import { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits, time } from 'discord.js';
import {
  addWarning,
  clearWarnings,
  listWarnings,
  removeWarning,
  getWarningStats,
  getGuildWarningEntries
} from '../../utils/warnStorage.js';
import { formatUserMention, sendModerationLog } from '../../utils/modLog.js';

export default {
  category: 'Moderasyon',
  data: new SlashCommandBuilder()
    .setName('uyari')
    .setDescription('Uyarı sistemini yönetir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('ekle')
        .setDescription('Bir kullanıcıya uyarı ekler.')
        .addUserOption((option) =>
          option.setName('kullanici').setDescription('Uyarılacak kullanıcı').setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('sebep').setDescription('Uyarının sebebi').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('liste')
        .setDescription('Bir kullanıcının uyarılarını listeler.')
        .addUserOption((option) =>
          option
            .setName('kullanici')
            .setDescription('Uyarıları görüntülenecek kullanıcı (varsayılan: kendin)')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('sil')
        .setDescription('Belirli bir uyarıyı kaldırır.')
        .addUserOption((option) =>
          option.setName('kullanici').setDescription('Uyarısı silinecek kullanıcı').setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName('numara')
            .setDescription('Silinecek uyarının numarası (1, 2, 3, ...)')
            .setMinValue(1)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('temizle')
        .setDescription('Bir kullanıcının tüm uyarılarını siler.')
        .addUserOption((option) =>
          option.setName('kullanici').setDescription('Uyarıları temizlenecek kullanıcı').setRequired(true)
        )
    )
    .addSubcommand((sub) => sub.setName('istatistik').setDescription('Sunucudaki uyarı dağılımını özetler.')),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'ekle') {
      const member = interaction.options.getMember('kullanici');
      if (!member) {
        await interaction.reply({ content: 'Kullanıcı bulunamadı.', ephemeral: true });
        return;
      }

      if (member.user.bot) {
        await interaction.reply({ content: 'Botları uyaramazsın.', ephemeral: true });
        return;
      }

      const reason = interaction.options.getString('sebep', true);

      await addWarning(interaction.guildId, member.id, interaction.user.id, reason);

      await interaction.reply({
        content: `⚠️ ${member} kullanıcısına uyarı eklendi. Sebep: ${reason}`,
        ephemeral: true
      });

      await sendModerationLog(interaction.client, interaction.guildId, {
        action: 'Uyarı Ekle',
        moderator: formatUserMention(interaction.user),
        target: formatUserMention(member),
        reason,
        color: 0xf39c12
      });
      return;
    }

    if (sub === 'liste') {
      const user = interaction.options.getUser('kullanici') ?? interaction.user;
      const warnings = await listWarnings(interaction.guildId, user.id);

      if (!warnings.length) {
        await interaction.reply({ content: `${user} için kayıtlı uyarı bulunmuyor.`, ephemeral: true });
        return;
      }

      const lines = warnings.map((warning, index) => {
        const timestamp = time(Math.floor(new Date(warning.createdAt).getTime() / 1000));
        return `**${index + 1}.** ${warning.reason} — Yetkili: <@${warning.moderatorId}> (${timestamp})`;
      });

      await interaction.reply({
        content: `📋 ${user} için ${warnings.length} uyarı bulundu:\n${lines.join('\n')}`,
        ephemeral: true
      });
      return;
    }

    if (sub === 'istatistik') {
      const [stats, entries] = await Promise.all([
        getWarningStats(interaction.guildId),
        getGuildWarningEntries(interaction.guildId)
      ]);

      const sorted = entries
        .map((entry) => ({ userId: entry.userId, count: entry.warnings.length }))
        .filter((entry) => entry.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const embed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle('⚖️ Uyarı İstatistikleri')
        .addFields(
          { name: 'Toplam Uyarı', value: `${stats.totalWarnings}`, inline: true },
          { name: 'Etkilenen Üye', value: `${stats.totalUsers}`, inline: true }
        )
        .setTimestamp();

      if (sorted.length) {
        const lines = sorted.map((entry, index) => `**${index + 1}.** <@${entry.userId}> — ${entry.count} uyarı`);
        embed.addFields({ name: 'Öne Çıkan Üyeler', value: lines.join('\n') });
      } else {
        embed.addFields({ name: 'Öne Çıkan Üyeler', value: 'Henüz kayıtlı uyarı yok.' });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === 'sil') {
      const member = interaction.options.getUser('kullanici', true);
      const number = interaction.options.getInteger('numara', true);
      const removed = await removeWarning(interaction.guildId, member.id, number - 1);

      await interaction.reply({
        content: removed
          ? `🗑️ ${member} için ${number}. uyarı silindi.`
          : '⚠️ Belirtilen numarada bir uyarı bulunamadı.',
        ephemeral: true
      });

      if (removed) {
        await sendModerationLog(interaction.client, interaction.guildId, {
          action: 'Uyarı Sil',
          moderator: formatUserMention(interaction.user),
          target: formatUserMention(member),
          reason: `${number}. uyarı kaldırıldı.`,
          color: 0x3498db
        });
      }
      return;
    }

    if (sub === 'temizle') {
      const member = interaction.options.getUser('kullanici', true);
      const cleared = await clearWarnings(interaction.guildId, member.id);

      await interaction.reply({
        content: cleared
          ? `🧹 ${member} için tüm uyarılar temizlendi.`
          : 'ℹ️ Bu kullanıcının zaten kayıtlı uyarısı bulunmuyor.',
        ephemeral: true
      });

      if (cleared) {
        await sendModerationLog(interaction.client, interaction.guildId, {
          action: 'Uyarı Temizleme',
          moderator: formatUserMention(interaction.user),
          target: formatUserMention(member),
          reason: 'Kullanıcının tüm uyarıları temizlendi.',
          color: 0x1abc9c
        });
      }
    }
  }
};
