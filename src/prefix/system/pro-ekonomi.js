import { EmbedBuilder } from 'discord.js';
import { getEconomySnapshot } from '../../utils/economyStorage.js';
import { isProMember } from '../../utils/proMembership.js';

function formatCoins(amount) {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  return `${safe.toLocaleString('tr-TR')} 💰`;
}

export default {
  name: 'pro-ekonomi',
  aliases: ['proeco', 'pro-ekonomi-raporu'],
  catalogKey: 'pro-ekonomi',
  category: 'Extra',
  menuGroup: 'Pro Yönetimi',
  description: 'Furmin ekonomi sistemindeki son hareketleri Pro üyelerle paylaşır.',
  proOnly: true,
  async execute(message) {
    const allowed = (await isProMember(message.author.id)) || message.author.id === message.client.ownerId;
    if (!allowed) {
      await message.reply({
        content: '💎 Bu raporu yalnızca Pro üyeler görüntüleyebilir.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const snapshot = await getEconomySnapshot(5);
    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('💰 Pro Ekonomi Özeti')
      .setDescription('FurCoin hareketlerinin güncel görünümü:')
      .addFields(
        { name: 'Toplam Bakiye', value: formatCoins(snapshot.totalBalance), inline: true },
        { name: 'Ortalama Bakiye', value: formatCoins(snapshot.averageBalance), inline: true },
        { name: 'Katılımcı', value: `${snapshot.participantCount}`, inline: true },
        { name: 'Görev Tamamlama', value: `${snapshot.questCount} görev`, inline: true },
        {
          name: 'Yatırım Performansı',
          value: `Kazanç: ${snapshot.investmentWins} • Kayıp: ${snapshot.investmentLosses}`,
          inline: true
        },
        { name: 'En Uzun Seri', value: `${snapshot.topStreak} gün`, inline: true }
      )
      .setTimestamp();

    if (snapshot.topBalances.length) {
      const lines = snapshot.topBalances
        .map((entry, index) => `**${index + 1}.** <@${entry.userId}> — ${formatCoins(entry.balance)}`)
        .join('\n');
      embed.addFields({ name: 'İlk 5 FurCoin Lideri', value: lines });
    } else {
      embed.addFields({ name: 'İlk 5 FurCoin Lideri', value: 'Henüz FurCoin biriktiren yok.' });
    }

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
