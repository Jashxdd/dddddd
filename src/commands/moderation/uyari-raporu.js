import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { getGuildWarningEntries, getWarningStats } from '../../utils/warnStorage.js';

export default {
  category: 'Moderasyon',
  menuGroup: 'Koruma & Log',
  proOnly: true,
  deferEphemeral: true,
  data: new SlashCommandBuilder()
    .setName('uyari-raporu')
    .setDescription('Sunucudaki uyarı kayıtlarının özetini çıkarır (Pro).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const stats = await getWarningStats(interaction.guildId);
    const entries = await getGuildWarningEntries(interaction.guildId);

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle('📊 Uyarı Raporu')
      .setDescription('Furmin Pro ile sunucudaki uyarı kayıtlarının hızlı özeti.')
      .addFields(
        { name: 'Uyarı Alan Üye', value: `${stats.totalUsers}`, inline: true },
        { name: 'Toplam Uyarı', value: `${stats.totalWarnings}`, inline: true },
        { name: 'Son Güncelleme', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setFooter({ text: 'Detaylı inceleme için /uyari liste komutunu kullan.' });

    const ranked = entries
      .filter((entry) => Array.isArray(entry.warnings) && entry.warnings.length)
      .map((entry) => ({ userId: entry.userId, count: entry.warnings.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (ranked.length) {
      const lines = ranked.map(
        (entry, index) => `**${index + 1}.** <@${entry.userId}> — ${entry.count} uyarı`
      );

      embed.addFields({ name: 'En Çok Uyarı Alanlar', value: lines.join('\n') });
    } else {
      embed.addFields({ name: 'En Çok Uyarı Alanlar', value: 'Henüz kayıtlı uyarı bulunmuyor.' });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
