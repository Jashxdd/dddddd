import { EmbedBuilder, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { getWarningStats } from '../../utils/warnStorage.js';
import { getAcceptedUsers } from '../../utils/rulesStorage.js';

export default {
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  data: new SlashCommandBuilder()
    .setName('topluluk-raporu')
    .setDescription('Üye sayıları, çevrim içi oranı ve kuralları kabul edenleri raporlar.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const guild = interaction.guild;
    await guild.members.fetch({ withPresences: false }).catch(() => null);

    const totalMembers = guild.memberCount;
    const cachedMembers = guild.members.cache;
    const onlineMembers = cachedMembers.filter((member) => ['online', 'idle', 'dnd'].includes(member.presence?.status)).size;
    const botCount = cachedMembers.filter((member) => member.user.bot).size;

    const [warningStats, acceptedUsers] = await Promise.all([
      getWarningStats(guild.id),
      getAcceptedUsers(guild.id)
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('📊 Topluluk Raporu')
      .addFields(
        {
          name: 'Üye Durumu',
          value: [`• Toplam üye: **${totalMembers}**`, `• Çevrim içi (önbellek): **${onlineMembers}**`, `• Bot: **${botCount}**`].join('\n')
        },
        {
          name: 'Kurallar & Güvenlik',
          value: [`• Kuralları kabul eden: **${acceptedUsers.length}**`, `• Uyarı kaydı: **${warningStats.totalWarnings}**`, `• Uyarı alan üye: **${warningStats.totalUsers}**`].join('\n')
        }
      )
      .setFooter({ text: 'Furmin topluluk yönetim raporu' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
