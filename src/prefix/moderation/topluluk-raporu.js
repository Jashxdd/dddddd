import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import { getWarningStats } from '../../utils/warnStorage.js';
import { getAcceptedUsers } from '../../utils/rulesStorage.js';

export default {
  name: 'topluluk-raporu',
  aliases: ['toplulukraporu', 'trap'],
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  description: 'Üye sayıları, çevrim içi oranı ve kuralları kabul edenleri raporlar.',
  requiredPermissions: [PermissionsBitField.Flags.ManageGuild],
  async execute(message) {
    await message.guild.members.fetch({ withPresences: false }).catch(() => null);

    const totalMembers = message.guild.memberCount;
    const cachedMembers = message.guild.members.cache;
    const onlineMembers = cachedMembers.filter((member) => ['online', 'idle', 'dnd'].includes(member.presence?.status)).size;
    const botCount = cachedMembers.filter((member) => member.user.bot).size;

    const [warningStats, acceptedUsers] = await Promise.all([
      getWarningStats(message.guildId ?? ''),
      getAcceptedUsers(message.guildId ?? '')
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

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
