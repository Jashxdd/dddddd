import { EmbedBuilder, userMention } from 'discord.js';
import { economyItems, findEconomyItem } from '../../data/economyItems.js';
import {
  addInventoryItem,
  canClaimDaily,
  canUseAction,
  getEconomyProfile,
  getInventory,
  getLeaderboard,
  incrementStat,
  modifyBalance,
  recordActionUsage,
  recordDailyClaim
} from '../../utils/economyStorage.js';
import {
  calculateQuestReward,
  pickQuestScenario,
  resolveInvestment,
  QUEST_COOLDOWN,
  INVESTMENT_COOLDOWN,
  INVESTMENT_MINIMUM
} from '../../utils/economyGameplay.js';

const WORK_COOLDOWN = 60 * 60 * 1000;
const ADVENTURE_COOLDOWN = 90 * 60 * 1000;
const DAILY_BASE_REWARD = 250;
const DAILY_STREAK_BONUS = 35;
const ADVENTURE_FAIL_PENALTY = 40;

const usage =
  'Kullanım: `ekonomi bakiye [@üye]`, `ekonomi gunluk`, `ekonomi calis`, `ekonomi macera`, `ekonomi gorev`, `ekonomi yatirim <miktar>`, `ekonomi hediye @üye miktar`, `ekonomi market`, `ekonomi satinal <urun> [adet]`, `ekonomi envanter`, `ekonomi liderlik`.';

function formatCurrency(amount) {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  return `${safeAmount.toLocaleString('tr-TR')} 💰`;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} sa ${remainingMinutes} dk`;
  }
  if (minutes > 0) {
    return `${minutes} dk ${seconds} sn`;
  }
  return `${seconds} sn`;
}

function pickRandom(min, max) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

function buildMarketEmbed() {
  const embed = new EmbedBuilder()
    .setColor(0x27ae60)
    .setTitle('🛒 Furmin Marketi')
    .setDescription('Satın alabileceğin ürünlerin kısa listesi:');

  economyItems.forEach((item) => {
    embed.addFields({ name: `${item.name} — ${formatCurrency(item.price)}`, value: item.description });
  });

  embed.setFooter({ text: 'Satın almak için: ekonomi satinal <urun-id> [adet]' });
  return embed;
}

function buildInventoryEmbed(user, inventory) {
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`🎒 ${user.username} — Envanter`)
    .setTimestamp();

  const entries = Object.entries(inventory);
  if (!entries.length) {
    embed.setDescription('Envanterinde henüz ürün yok. Marketten alışveriş yapabilirsin.');
    return embed;
  }

  embed.setDescription(
    entries
      .map(([itemId, amount]) => {
        const item = findEconomyItem(itemId);
        const label = item ? item.name : itemId;
        return `• **${label}** × ${amount}`;
      })
      .join('\n')
  );

  return embed;
}

function buildLeaderboardEmbed(client, entries) {
  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('🏆 Furmin Zenginler Kulübü')
    .setTimestamp();

  if (!entries.length) {
    embed.setDescription('Henüz listelenecek ekonomi bilgisi yok. İlk adımı sen atabilirsin!');
    return embed;
  }

  embed.setDescription(
    entries
      .map((entry, index) => {
        const user = client.users.cache.get(entry.userId);
        const label = user ? `${user.username} (${userMention(entry.userId)})` : `Bilinmeyen Üye (${entry.userId})`;
        return `**${index + 1}.** ${label} — ${formatCurrency(entry.balance)}`;
      })
      .join('\n')
  );

  return embed;
}

export default {
  name: 'ekonomi',
  aliases: ['eco', 'furcoin', 'para'],
  category: 'Ekonomi',
  menuGroup: 'Ekonomi Sistemleri',
  description: 'Furmin ekonomi komutlarını yönetir.',
  async execute(message, args, context) {
    const prefix = context?.prefix ?? 'f!';
    const action = (args.shift() ?? '').toLowerCase();

    if (!action) {
      await message.reply({
        content: `${usage}\nMarket ürünlerini görmek için: \`${prefix}ekonomi market\`.`,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const userId = message.author.id;

    try {
      if (['bakiye', 'bakiyem', 'balance'].includes(action)) {
        const target = message.mentions.users.first() ?? message.client.users.cache.get(args[0]) ?? message.author;
        const profile = await getEconomyProfile(target.id);
        const embed = new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle(`💰 ${target.username} — Ekonomi Profili`)
          .addFields(
            { name: 'Bakiye', value: formatCurrency(profile.balance), inline: true },
            { name: 'Günlük Seri', value: `${profile.streak.count} gün`, inline: true },
            {
              name: 'İstatistikler',
              value:
                `• Çalışma: **${profile.stats.work}** kez\n` +
                `• Macera: **${profile.stats.adventure}** kez\n` +
                `• Görev: **${profile.stats.quests}** tamamlandı\n` +
                `• Hediyeleşme: **${profile.stats.giftsSent}** / **${profile.stats.giftsReceived}**\n` +
                `• Yatırım: **${profile.stats.investmentWins}** kazanç / **${profile.stats.investmentLosses}** kayıp`
            }
          )
          .setTimestamp();

        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        return;
      }

      if (['gunluk', 'daily'].includes(action)) {
        const check = await canClaimDaily(userId);
        if (!check.available) {
          await message.reply({
            content: `⏳ Günlük ödülün için biraz beklemelisin. Kalan süre: **${formatDuration(check.remaining)}**.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        const streak = await recordDailyClaim(userId);
        const bonus = Math.min(DAILY_STREAK_BONUS * (streak.count - 1), 350);
        const reward = DAILY_BASE_REWARD + Math.max(0, bonus);
        await modifyBalance(userId, reward);

        const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('📆 Günlük Ödül Alındı')
          .setDescription(
            `Bugünkü ödülün **${formatCurrency(reward)}** oldu. Seri durumun: **${streak.count} gün**. Düzenli girişlerle bonus büyür!`
          )
          .setTimestamp();

        if (bonus > 0) {
          embed.addFields({ name: 'Seri Bonusu', value: `${formatCurrency(bonus)} ek kazanç` });
        }

        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        return;
      }

      if (['calis', 'çalış', 'work'].includes(action)) {
        const availability = await canUseAction(userId, 'work', WORK_COOLDOWN);
        if (!availability.available) {
          await message.reply({
            content: `💼 Şimdilik dinlenmelisin. Tekrar çalışmak için **${formatDuration(availability.remaining)}** bekle.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        const reward = pickRandom(80, 160);
        await modifyBalance(userId, reward);
        await incrementStat(userId, 'work', 1);
        await recordActionUsage(userId, 'work');

        await message.reply({
          content: `💼 Mesai tamamlandı! **${formatCurrency(reward)}** kazandın.`,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      if (['macera', 'av', 'adventure'].includes(action)) {
        const availability = await canUseAction(userId, 'adventure', ADVENTURE_COOLDOWN);
        if (!availability.available) {
          await message.reply({
            content: `🧭 Macera için biraz bekle. Kalan süre: **${formatDuration(availability.remaining)}**.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        await recordActionUsage(userId, 'adventure');
        await incrementStat(userId, 'adventure', 1);

        if (Math.random() < 0.7) {
          const reward = pickRandom(120, 260);
          await modifyBalance(userId, reward);
          await message.reply({
            content: `🗺️ Macera başarılı! Hazine sandığından **${formatCurrency(reward)}** topladın.`,
            allowedMentions: { repliedUser: false }
          });
        } else {
          const penalty = pickRandom(10, ADVENTURE_FAIL_PENALTY);
          await modifyBalance(userId, -penalty);
          await message.reply({
            content: `💥 Ufak bir aksilik oldu ve **${formatCurrency(penalty)}** masraf yaptın.`,
            allowedMentions: { repliedUser: false }
          });
        }
        return;
      }

      if (['gorev', 'görev', 'quest'].includes(action)) {
        const availability = await canUseAction(userId, 'quest', QUEST_COOLDOWN);
        if (!availability.available) {
          await message.reply({
            content: `🗒️ Yeni göreve başlamadan önce **${formatDuration(availability.remaining)}** beklemelisin.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        const scenario = pickQuestScenario();
        const reward = calculateQuestReward();

        await recordActionUsage(userId, 'quest');
        await incrementStat(userId, 'quests', 1);
        await modifyBalance(userId, reward);

        const profile = await getEconomyProfile(userId);
        const embed = new EmbedBuilder()
          .setColor(0x1abc9c)
          .setTitle('🗒️ Görev Başarıyla Tamamlandı')
          .setDescription(`• Görev: ${scenario.prompt}\n• Sonuç: ${scenario.result}`)
          .addFields(
            { name: 'Kazanç', value: formatCurrency(reward), inline: true },
            { name: 'Güncel Bakiye', value: formatCurrency(profile.balance), inline: true }
          )
          .setFooter({ text: 'Görevler 6 saatte bir yenilenir.' })
          .setTimestamp();

        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        return;
      }

      if (['yatirim', 'yatırım', 'invest'].includes(action)) {
        const amountRaw = args.shift();
        const amount = Number.parseInt(amountRaw ?? '', 10);

        if (!Number.isFinite(amount) || amount < INVESTMENT_MINIMUM) {
          await message.reply({
            content: `📉 Lütfen en az ${formatCurrency(INVESTMENT_MINIMUM)} değerinde bir miktar yaz.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        const profile = await getEconomyProfile(userId);
        if (amount > profile.balance) {
          await message.reply({
            content: `💳 Yatırım için **${formatCurrency(amount)}** gerekli. Şu anki bakiyen ${formatCurrency(profile.balance)}.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        const availability = await canUseAction(userId, 'investment', INVESTMENT_COOLDOWN);
        if (!availability.available) {
          await message.reply({
            content: `⏳ Yeni bir yatırım denemesi için **${formatDuration(availability.remaining)}** beklemelisin.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        await recordActionUsage(userId, 'investment');
        await modifyBalance(userId, -amount);

        const outcome = resolveInvestment(amount);
        if (outcome.payout > 0) {
          await modifyBalance(userId, outcome.payout);
        }

        if (outcome.success) {
          await incrementStat(userId, 'investmentWins', 1);
        } else {
          await incrementStat(userId, 'investmentLosses', 1);
        }

        const netChange = outcome.payout - amount;
        const refreshed = await getEconomyProfile(userId);

        const embed = new EmbedBuilder()
          .setColor(outcome.success ? 0x2ecc71 : 0xe74c3c)
          .setTitle('📈 Yatırım Değerlendirmesi')
          .setDescription(outcome.message)
          .addFields(
            { name: 'Yatırım Miktarı', value: formatCurrency(amount), inline: true },
            {
              name: outcome.success ? 'Net Kazanç' : 'Net Kayıp',
              value: `${netChange >= 0 ? '+' : '-'}${formatCurrency(Math.abs(netChange))}`,
              inline: true
            },
            { name: 'Güncel Bakiye', value: formatCurrency(refreshed.balance), inline: true }
          )
          .setFooter({ text: 'Yatırım komutunun bekleme süresi 30 dakikadır.' })
          .setTimestamp();

        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        return;
      }

      if (['hediye', 'gonder', 'gönder'].includes(action)) {
        const target = message.mentions.users.first();
        const amountRaw = args.shift();
        const amount = Number.parseInt(amountRaw ?? '', 10);

        if (!target || target.bot) {
          await message.reply({
            content: '🎁 Geçerli bir üye etiketlemelisin. Botlara hediye gönderemezsin.',
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
          await message.reply({
            content: '🎁 Göndermek istediğin miktarı sayı olarak yazmalısın.',
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        if (target.id === userId) {
          await message.reply({
            content: '🎁 Kendine hediye gönderemezsin. Başka bir üyeyi seç.',
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        const profile = await getEconomyProfile(userId);
        if (amount > profile.balance) {
          await message.reply({
            content: `💸 Bakiye yetersiz. Şu anda en fazla **${formatCurrency(profile.balance)}** gönderebilirsin.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        await modifyBalance(userId, -amount);
        await modifyBalance(target.id, amount);
        await incrementStat(userId, 'giftsSent', 1);
        await incrementStat(target.id, 'giftsReceived', 1);

        await message.reply({
          content: `🎁 ${userMention(target.id)} üyesine **${formatCurrency(amount)}** gönderdin.`,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      if (['market', 'magaza', 'mağaza'].includes(action)) {
        const embed = buildMarketEmbed();
        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        return;
      }

      if (['satinal', 'satınal', 'buy'].includes(action)) {
        const itemId = (args.shift() ?? '').toLowerCase();
        const quantityRaw = args.shift();
        const quantity = Number.isFinite(Number.parseInt(quantityRaw ?? '', 10))
          ? Math.max(1, Math.min(10, Number.parseInt(quantityRaw, 10)))
          : 1;

        const item = findEconomyItem(itemId);
        if (!item) {
          await message.reply({
            content: '🛍️ Geçersiz ürün. `ekonomi market` komutuyla geçerli ürünleri görebilirsin.',
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        const cost = item.price * quantity;
        const profile = await getEconomyProfile(userId);
        if (cost > profile.balance) {
          await message.reply({
            content: `💳 Bu alışveriş için **${formatCurrency(cost)}** gerekiyor. Bakiyen: **${formatCurrency(profile.balance)}**.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        await modifyBalance(userId, -cost);
        const result = await addInventoryItem(userId, item.id, quantity);

        const embed = new EmbedBuilder()
          .setColor(0x8e44ad)
          .setTitle('🛍️ Alışveriş Başarılı')
          .setDescription(`${item.name} ürününden ${quantity} adet aldın. Toplam tutar: ${formatCurrency(cost)}.`)
          .addFields({ name: 'Envanter', value: `${item.name}: ${result.total} adet` })
          .setTimestamp();

        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        return;
      }

      if (['envanter', 'canta', 'çanta', 'inventory'].includes(action)) {
        const inventory = await getInventory(userId);
        const embed = buildInventoryEmbed(message.author, inventory);
        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        return;
      }

      if (['liderlik', 'top', 'zenginler'].includes(action)) {
        const leaderboard = await getLeaderboard(10);
        const embed = buildLeaderboardEmbed(message.client, leaderboard);
        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        return;
      }

      await message.reply({
        content: `❓ Bilinmeyen ekonomi işlemi. ${usage}`,
        allowedMentions: { repliedUser: false }
      });
    } catch (error) {
      console.error('Prefix ekonomi komutu çalışırken hata oluştu:', error);
      await message.reply({
        content: '⚠️ Ekonomi işlemi sırasında beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar dene.',
        allowedMentions: { repliedUser: false }
      });
    }
  }
};
