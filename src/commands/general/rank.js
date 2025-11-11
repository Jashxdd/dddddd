import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getLeaderboard, getLevelConfig } from '../../utils/xpStorage.js';

export function buildLevelLeaderboard({ guild, entries }) {
  const embed = new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle('🏆 XP Liderlik Tablosu')
    .setDescription('Sunucuda en fazla deneyim puanına sahip üyeler burada listelenir.')
    .setFooter({ text: guild?.name ?? 'Furmin Pro' })
    .setTimestamp();

  if (!entries.length) {
    embed.addFields({ name: 'Bilgi', value: 'Henüz kayıtlı deneyim verisi bulunmuyor. Sohbete katılarak XP kazanabilirsiniz!' });
    return embed;
  }

  const lines = entries.slice(0, 10).map((entry, index) => {
    const position = index + 1;
    const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `#${position}`;
    return `${medal} <@${entry.userId}> — **${entry.totalXp.toLocaleString('tr-TR')} XP** (Seviye ${entry.level})`;
  });

  embed.addFields({ name: 'Sıralama', value: lines.join('\n') });
  return embed;
}

export default {
  category: 'Extra',
  menuGroup: 'Pro Üyelik',
  proOnly: true,
  data: new SlashCommandBuilder().setName('rank').setDescription('XP liderlik tablosunu gösterir (Pro üyelere özel).'),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucuda kullanılabilir.', ephemeral: true });
      return;
    }

    const levelConfig = getLevelConfig(interaction.guild?.id);
    if (!levelConfig.enabled) {
      await interaction.reply({
        content: 'Seviye sistemi bu sunucuda devre dışı. Sunucu yöneticilerinden özelliği açmasını isteyebilirsin.',
        ephemeral: true
      });
      return;
    }

    const entries = await getLeaderboard(interaction.guild.id, 10);

    const embed = buildLevelLeaderboard({ guild: interaction.guild, entries });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
