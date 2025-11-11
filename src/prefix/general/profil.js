import { buildProfileEmbed } from '../../commands/general/profil.js';
import { listWarnings } from '../../utils/warnStorage.js';
import { getUserLevel, getLevelConfig } from '../../utils/xpStorage.js';

export default {
  name: 'profil',
  aliases: ['profilim'],
  category: 'Genel',
  description: 'Kullanıcı profil kartını mesaj olarak gönderir.',
  menuGroup: 'Kullanıcı Sistemleri',
  async execute(message, args) {
    if (!message.guild) {
      await message.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.' });
      return;
    }

    const mention = message.mentions.members?.first();
    let fetched = null;
    if (!mention && args[0]) {
      const id = args[0].replace(/[^0-9]/g, '');
      if (id) {
        fetched = await message.guild.members.fetch({ user: id, cache: true }).catch(() => null);
      }
    }

    const member = mention ?? fetched ?? message.member;
    if (!member) {
      await message.reply({ content: 'Kullanıcı bilgisi alınamadı.', allowedMentions: { repliedUser: false } });
      return;
    }

    const warnings = await listWarnings(message.guild.id, member.id);
    let levelData = null;
    const levelConfig = getLevelConfig();
    if (levelConfig.enabled) {
      levelData = await getUserLevel(message.guild.id, member.id);
    }

    const embed = buildProfileEmbed({
      member,
      user: member.user,
      guild: message.guild,
      warningsCount: warnings.length,
      levelData
    });

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
