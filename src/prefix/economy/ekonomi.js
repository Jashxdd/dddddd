import { EmbedBuilder, PermissionFlagsBits, userMention } from 'discord.js';
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
import { isEconomyBlacklisted } from '../../utils/blacklistStorage.js';
import { getUserEconomyHistory, recordEconomyEvent } from '../../utils/economyLedgerStorage.js';
import { logEconomyChange } from '../../utils/economyLog.js';
import {
  applyBonus,
  describeEconomyConfig,
  getEconomyConfig,
  setEconomyBonusMultiplier,
  setEconomyCurrency
} from '../../utils/economyConfigStorage.js';

const WORK_COOLDOWN = 60 * 60 * 1000;
const ADVENTURE_COOLDOWN = 90 * 60 * 1000;
const CRATE_COOLDOWN = 10 * 60 * 1000;
const DAILY_BASE_REWARD = 250;
const DAILY_STREAK_BONUS = 35;
const ADVENTURE_FAIL_PENALTY = 40;
const CRATE_COST = 320;
const CRATE_REWARD_RANGE = [200, 520];
const CRATE_ITEM_CHANCE = 0.35;
const GUESS_ENTRY_COST = 150;
const GUESS_REWARD_RANGE = [320, 640];
const WHEEL_ENTRY_COST = 200;
const WHEEL_COOLDOWN = 15 * 60 * 1000;
const WHEEL_MULTIPLIERS = [0, 0.5, 1, 1.5, 2.5, 4];
const ARENA_ENTRY_COST = 250;
const ARENA_COOLDOWN = 25 * 60 * 1000;
const ARENA_REWARD_RANGE = [320, 680];

const TYPE_LABELS = {
  daily: 'Günlük Ödül',
  work: 'Çalışma',
  adventure: 'Macera',
  adventure_fail: 'Macera Kaybı',
  quest: 'Görev',
  investment: 'Yatırım',
  gift_sent: 'Hediye Gönderimi',
  gift_received: 'Hediye Alımı',
  purchase: 'Market Alımı',
  crate: 'Şans Kasası',
  guess: 'Tahmin Oyunu',
  wheel: 'Çark Oyunu',
  duel: 'Arena Karşılaşması',
  owner_adjust: 'Sahip İşlemi'
};

const MARKET_CATEGORIES = Array.from(
  new Set(economyItems.map((item) => (item.category ?? 'genel').toLowerCase()))
);

const usage =
  'Kullanım: `ekonomi bakiye [@üye]`, `ekonomi kayit [@üye] [limit]`, `ekonomi gunluk`, `ekonomi calis`, `ekonomi macera`, `ekonomi gorev`, `ekonomi kasa`, `ekonomi tahmin <sayi>`, `ekonomi cark`, `ekonomi arena`, `ekonomi yatirim <miktar>`, `ekonomi hediye @üye miktar`, `ekonomi market [kategori]`, `ekonomi satinal <urun> [adet]`, `ekonomi envanter`, `ekonomi liderlik`, `ekonomi ayar <isim|sembol|bonus|goster> [değer]`.';

function formatCurrency(amount, config = null) {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  const symbol = config?.currencySymbol ?? '💰';
  return `${safeAmount.toLocaleString('tr-TR')} ${symbol}`;
}

function createCurrencyFormatter(config) {
  return (amount) => formatCurrency(amount, config);
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

function resolveTypeLabel(type) {
  if (!type) return 'Genel İşlem';
  if (TYPE_LABELS[type]) return TYPE_LABELS[type];
  return type
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildHistoryEmbed(user, entries, formatAmount) {
  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle(`📜 ${user.username} — Ekonomi Kayıtları`)
    .setTimestamp();

  if (!entries.length) {
    embed.setDescription('Henüz kayıt bulunamadı. Ekonomi komutlarını kullanarak geçmişini oluşturabilirsin.');
    return embed;
  }

  const lines = entries.map((entry) => {
    const amountLabel = entry.amount >= 0
      ? `+${formatAmount(entry.amount)}`
      : `-${formatAmount(Math.abs(entry.amount))}`;
    const balanceLabel = formatAmount(entry.balanceAfter);
    const timeLabel = entry.timestamp ? `<t:${Math.floor(entry.timestamp / 1000)}:R>` : 'Bilinmiyor';
    const noteLine = entry.note ? `\n    ↳ ${entry.note}` : '';
    return `• **${resolveTypeLabel(entry.type)}** • ${amountLabel} • Bakiye: ${balanceLabel} • ${timeLabel}${noteLine}`;
  });

  embed.setDescription(lines.join('\n'));
  return embed;
}

function buildProfileEmbed(user, profile, formatAmount, currencyName) {
  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`💰 ${user.username} — Ekonomi Profili`)
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: 'Bakiye', value: formatAmount(profile.balance), inline: true },
      { name: 'Günlük Seri', value: `${profile.streak.count} gün`, inline: true },
      {
        name: 'İstatistikler',
        value:
          `• Çalışma: **${profile.stats.work}** kez\n` +
          `• Macera: **${profile.stats.adventure}** kez\n` +
          `• Görev: **${profile.stats.quests}** tamamlandı\n` +
          `• Tahmin Oyunu: **${profile.stats.guessPlays}** deneme / **${profile.stats.guessWins}** isabet\n` +
          `• Çark Denemeleri: **${profile.stats.wheelSpins ?? 0}** tur\n` +
          `• Arena: **${profile.stats.arenaWins ?? 0}** galibiyet / **${profile.stats.arenaMatches ?? 0}** maç\n` +
          `• Hediyeleşme: **${profile.stats.giftsSent}** gönderildi / **${profile.stats.giftsReceived}** alındı\n` +
          `• Yatırım: **${profile.stats.investmentWins}** kazanç / **${profile.stats.investmentLosses}** kayıp`
      }
    )
    .addFields({ name: 'Para Birimi', value: currencyName, inline: true })
    .setFooter({ text: 'Furmin Ekonomi — Kazançlarını akıllıca kullan!' })
    .setTimestamp();
}

function buildMarketEmbed(formatAmount, currencyName, category = 'all') {
  const normalised = category?.toLowerCase() ?? 'all';
  const filteredItems = normalised === 'all'
    ? economyItems
    : economyItems.filter((item) => (item.category ?? 'genel').toLowerCase() === normalised);

  const embed = new EmbedBuilder()
    .setColor(0x27ae60)
    .setTitle(`🛒 ${currencyName} Pazarı`)
    .setTimestamp();

  if (normalised !== 'all') {
    const label = normalised.charAt(0).toLocaleUpperCase('tr') + normalised.slice(1);
    embed.setDescription(`Kategori: **${label}** — seçili ürünlerin etkileri aşağıdadır.`);
  } else {
    embed.setDescription('Satın alabileceğin ürünlerin kısa listesi:');
  }

  if (!filteredItems.length) {
    embed.addFields({ name: 'Ürün bulunamadı', value: 'Bu kategoriye ait ürün tanımlanmamış.' });
    embed.setFooter({ text: 'Farklı kategoriler için: ekonomi market <kategori>' });
    return embed;
  }

  filteredItems.forEach((item) => {
    const categoryLabel = item.category
      ? item.category.charAt(0).toLocaleUpperCase('tr') + item.category.slice(1)
      : 'Genel';
    embed.addFields({
      name: `${item.name} — ${formatAmount(item.price)} (${categoryLabel})`,
      value: item.description
    });
  });

  const availableCategories = MARKET_CATEGORIES.length
    ? MARKET_CATEGORIES.map((cat) => (cat === 'genel' ? 'genel' : cat)).join(', ')
    : 'genel';

  embed.setFooter({
    text: `Satın almak için: ekonomi satinal <urun-id> [adet] • Kategoriler: ${availableCategories}`
  });
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

function buildLeaderboardEmbed(client, entries, formatAmount) {
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
        return `**${index + 1}.** ${label} — ${formatAmount(entry.balance)}`;
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
    const guildId = message.guildId ?? '';

    if (!action) {
      await message.reply({
        content: `${usage}\nMarket ürünlerini görmek için: \`${prefix}ekonomi market\`.`,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const userId = message.author.id;

    if (await isEconomyBlacklisted(userId)) {
      await message.reply({
        content:
          '⛔ Ekonomi sistemlerine erişimin devre dışı. Destek için lütfen Furmin sahibi ile iletişime geç.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    let economyConfig = await getEconomyConfig(guildId);
    let formatAmount = createCurrencyFormatter(economyConfig);
    let bonusMultiplier = economyConfig.bonusMultiplier ?? 1;
    const currencyName = economyConfig.currencyName;

    try {
      if (['bakiye', 'bakiyem', 'balance'].includes(action)) {
        const target = message.mentions.users.first() ?? message.client.users.cache.get(args[0]) ?? message.author;
        const profile = await getEconomyProfile(target.id);
        const embed = buildProfileEmbed(target, profile, formatAmount, currencyName);
        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        return;
      }

      if (['kayit', 'kayıt', 'history'].includes(action)) {
        const target = message.mentions.users.first() ?? message.client.users.cache.get(args[0]) ?? message.author;
        const limitArg = message.mentions.users.first() ? args[0] : args[1];
        const parsedLimit = Number.parseInt(limitArg ?? '', 10);
        const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 10) : 5;
        const history = await getUserEconomyHistory(target.id, { limit });
        const embed = buildHistoryEmbed(target, history, formatAmount);
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
        const streakBonusBase = Math.min(DAILY_STREAK_BONUS * (streak.count - 1), 350);
        const totalReward = applyBonus(DAILY_BASE_REWARD + Math.max(0, streakBonusBase), bonusMultiplier);
        const baseReward = applyBonus(DAILY_BASE_REWARD, bonusMultiplier);
        const streakBonus = Math.max(0, totalReward - baseReward);
        const balanceAfter = await modifyBalance(userId, totalReward);
        await incrementStat(userId, 'work', 0);

        await recordEconomyEvent({
          userId,
          guildId,
          executorId: message.author.id,
          type: 'daily',
          amount: totalReward,
          balanceAfter,
          note: streakBonus > 0 ? `Seri bonusu: ${formatAmount(streakBonus)}` : undefined
        });

        if (message.inGuild()) {
          await logEconomyChange(message.client, message.guildId, {
            userId,
            executorId: message.author.id,
            amount: totalReward,
            balanceAfter,
            type: resolveTypeLabel('daily'),
            note: `Günlük seri: ${streak.count} gün`
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('📆 Günlük Ödül Alındı')
          .setDescription(
            `Bugünkü ödülün **${formatAmount(totalReward)}** oldu. Seri durumun: **${streak.count} gün**. Düzenli girişlerle bonus büyür!`
          )
          .setTimestamp();

        if (streakBonus > 0) {
          embed.addFields({ name: 'Seri Bonusu', value: `${formatAmount(streakBonus)} ek kazanç` });
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

        const reward = applyBonus(pickRandom(80, 160), bonusMultiplier);
        const balanceAfter = await modifyBalance(userId, reward);
        await incrementStat(userId, 'work', 1);
        await recordActionUsage(userId, 'work');

        await recordEconomyEvent({
          userId,
          guildId,
          executorId: message.author.id,
          type: 'work',
          amount: reward,
          balanceAfter
        });

        if (message.inGuild()) {
          await logEconomyChange(message.client, message.guildId, {
            userId,
            executorId: message.author.id,
            amount: reward,
            balanceAfter,
            type: resolveTypeLabel('work')
          });
        }

        await message.reply({
          content: `💼 Mesai tamamlandı! **${formatAmount(reward)}** kazandın.`,
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
          const reward = applyBonus(pickRandom(120, 260), bonusMultiplier);
          const balanceAfter = await modifyBalance(userId, reward);
          await recordEconomyEvent({
            userId,
            guildId,
            executorId: message.author.id,
            type: 'adventure',
            amount: reward,
            balanceAfter
          });

          if (message.inGuild()) {
            await logEconomyChange(message.client, message.guildId, {
              userId,
              executorId: message.author.id,
              amount: reward,
              balanceAfter,
              type: resolveTypeLabel('adventure'),
              note: 'Macera başarıyla tamamlandı.'
            });
          }
          await message.reply({
            content: `🗺️ Macera başarılı! Hazine sandığından **${formatAmount(reward)}** topladın.`,
            allowedMentions: { repliedUser: false }
          });
        } else {
          const penalty = applyBonus(pickRandom(10, ADVENTURE_FAIL_PENALTY), bonusMultiplier);
          const balanceAfter = await modifyBalance(userId, -penalty);
          await recordEconomyEvent({
            userId,
            guildId,
            executorId: message.author.id,
            type: 'adventure_fail',
            amount: -penalty,
            balanceAfter
          });

          if (message.inGuild()) {
            await logEconomyChange(message.client, message.guildId, {
              userId,
              executorId: message.author.id,
              amount: -penalty,
              balanceAfter,
              type: resolveTypeLabel('adventure_fail'),
              note: 'Macera sırasında kayıp yaşandı.'
            });
          }

          await message.reply({
            content: `💥 Ufak bir aksilik oldu ve **${formatAmount(penalty)}** masraf yaptın.`,
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
        const reward = applyBonus(calculateQuestReward(scenario.difficulty), bonusMultiplier);

        await recordActionUsage(userId, 'quest');
        await incrementStat(userId, 'quests', 1);
        const balanceAfter = await modifyBalance(userId, reward);

        await recordEconomyEvent({
          userId,
          guildId,
          executorId: message.author.id,
          type: 'quest',
          amount: reward,
          balanceAfter,
          note: scenario.prompt
        });

        if (message.inGuild()) {
          await logEconomyChange(message.client, message.guildId, {
            userId,
            executorId: message.author.id,
            amount: reward,
            balanceAfter,
            type: resolveTypeLabel('quest'),
            note: scenario.result
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0x1abc9c)
          .setTitle('🗒️ Görev Başarıyla Tamamlandı')
          .setDescription(`• Görev: ${scenario.prompt}\n• Sonuç: ${scenario.result}`)
          .addFields({ name: 'Kazanç', value: formatAmount(reward), inline: true })
          .setFooter({ text: 'Görevler 6 saatte bir yenilenir.' })
          .setTimestamp();

        const profile = await getEconomyProfile(userId);
        embed.addFields({ name: 'Güncel Bakiye', value: formatAmount(profile.balance), inline: true });

        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        return;
      }

      if (['kasa', 'kasaa', 'crate'].includes(action)) {
        const profile = await getEconomyProfile(userId);
        if (profile.balance < CRATE_COST) {
          await message.reply({
            content: `📦 Kasayı açmak için **${formatAmount(CRATE_COST)}** gerekiyor. Bakiyen ${formatAmount(profile.balance)}.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        const availability = await canUseAction(userId, 'crate', CRATE_COOLDOWN);
        if (!availability.available) {
          await message.reply({
            content: `⏳ Yeni bir kasayı açmak için **${formatDuration(availability.remaining)}** beklemelisin.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        await recordActionUsage(userId, 'crate');
        await modifyBalance(userId, -CRATE_COST);

        let netChange = -CRATE_COST;
        let rewardNote = 'Kasadan sürpriz hediyeler çıktı.';
        let rewardDescription = '';
        let rewardColor = 0x3498db;
        let finalProfile = null;

        if (Math.random() < CRATE_ITEM_CHANCE && economyItems.length) {
          const item = economyItems[Math.floor(Math.random() * economyItems.length)];
          await addInventoryItem(userId, item.id, 1);
          finalProfile = await getEconomyProfile(userId);
          rewardNote = `Ödül: ${item.name}`;
          rewardDescription = `🎁 Kasadan **${item.name}** çıktı! ${item.description}`;
          rewardColor = 0x9b59b6;
        } else {
          const coins = applyBonus(pickRandom(CRATE_REWARD_RANGE[0], CRATE_REWARD_RANGE[1]), bonusMultiplier);
          await modifyBalance(userId, coins);
          netChange += coins;
          finalProfile = await getEconomyProfile(userId);
          rewardNote = `Ödül: ${formatAmount(coins)}`;
          rewardDescription = `💎 Kasadan **${formatAmount(coins)}** çıktı!`;
          rewardColor = 0x1abc9c;
        }

        const finalBalance = finalProfile?.balance ?? profile.balance - CRATE_COST;

        await recordEconomyEvent({
          userId,
          guildId,
          executorId: message.author.id,
          type: 'crate',
          amount: netChange,
          balanceAfter: finalBalance,
          note: rewardNote
        });

        if (message.inGuild()) {
          await logEconomyChange(message.client, message.guildId, {
            userId,
            executorId: message.author.id,
            amount: netChange,
            balanceAfter: finalBalance,
            type: resolveTypeLabel('crate'),
            note: rewardNote
          });
        }

        const embed = new EmbedBuilder()
          .setColor(rewardColor)
          .setTitle('🎲 Şans Kasası Açıldı')
          .setDescription(
            `${rewardDescription}\n💸 Açılış ücreti: ${formatAmount(CRATE_COST)}\n🪙 Güncel bakiye: ${formatAmount(finalBalance)}`
          )
          .setFooter({ text: 'Kasalar 10 dakikada bir açılabilir.' })
          .setTimestamp();

        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        return;
      }

      if (['tahmin', 'guess'].includes(action)) {
        const numberArg = args.shift();
        const parsed = Number.parseInt(numberArg ?? '', 10);
        if (!Number.isFinite(parsed) || parsed < 1 || parsed > 10) {
          await message.reply({
            content: '🎯 Tahmin oyunu için 1 ile 10 arasında bir sayı girmelisin. Örnek: `ekonomi tahmin 7`',
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        const profile = await getEconomyProfile(userId);
        if (profile.balance < GUESS_ENTRY_COST) {
          await message.reply({
            content: `🎯 Tahmin oyununa katılmak için **${formatAmount(GUESS_ENTRY_COST)}** gerekiyor. Bakiyen ${formatAmount(profile.balance)}.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        await incrementStat(userId, 'guessPlays', 1);
        let balanceAfter = await modifyBalance(userId, -GUESS_ENTRY_COST);
        let netChange = -GUESS_ENTRY_COST;
        const secretNumber = pickRandom(1, 10);
        let description = `🎯 Gizli sayı **${secretNumber}** çıktı. Katılım ücreti ${formatAmount(GUESS_ENTRY_COST)} olarak düşüldü.`;
        let note = `Katılım bedeli: ${formatAmount(GUESS_ENTRY_COST)}`;
        let color = 0xe74c3c;

        if (parsed === secretNumber) {
          const reward = applyBonus(pickRandom(GUESS_REWARD_RANGE[0], GUESS_REWARD_RANGE[1]), bonusMultiplier);
          balanceAfter = await modifyBalance(userId, reward);
          netChange += reward;
          await incrementStat(userId, 'guessWins', 1);
          description = `🥳 Tebrikler! Gizli sayı **${secretNumber}** idi ve **${formatAmount(reward)}** kazandın.`;
          note = `Doğru tahmin ödülü: ${formatAmount(reward)} (Katılım ücreti: ${formatAmount(GUESS_ENTRY_COST)})`;
          color = 0x2ecc71;
        } else {
          description += ` Tahminin **${parsed}** idi.`;
        }

        await recordEconomyEvent({
          userId,
          guildId,
          executorId: message.author.id,
          type: 'guess',
          amount: netChange,
          balanceAfter,
          note
        });

        if (message.inGuild()) {
          await logEconomyChange(message.client, message.guildId, {
            userId,
            executorId: message.author.id,
            amount: netChange,
            balanceAfter,
            type: resolveTypeLabel('guess'),
            note
          });
        }

        const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle('🎯 Tahmin Oyunu Sonucu')
          .setDescription(description)
          .addFields(
            { name: 'Tahminin', value: `${parsed}`, inline: true },
            { name: 'Gizli Sayı', value: `${secretNumber}`, inline: true },
            { name: 'Güncel Bakiye', value: formatAmount(balanceAfter), inline: true }
          )
          .setFooter({ text: 'Tahmin oyunu giriş ücreti iade edilmez.' })
          .setTimestamp();

        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        return;
      }

      if (['cark', 'çark', 'wheel'].includes(action)) {
        const profile = await getEconomyProfile(userId);
        if (profile.balance < WHEEL_ENTRY_COST) {
          await message.reply({
            content: `🌀 Çarkı çevirmek için **${formatAmount(WHEEL_ENTRY_COST)}** gerekiyor. Bakiyen ${formatAmount(profile.balance)}.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        const availability = await canUseAction(userId, 'wheel', WHEEL_COOLDOWN);
        if (!availability.available) {
          await message.reply({
            content: `🌀 Çarkı tekrar çevirmeden önce **${formatDuration(availability.remaining)}** beklemelisin.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        await recordActionUsage(userId, 'wheel');
        await incrementStat(userId, 'wheelSpins', 1);

        await modifyBalance(userId, -WHEEL_ENTRY_COST);
        const multiplier = WHEEL_MULTIPLIERS[Math.floor(Math.random() * WHEEL_MULTIPLIERS.length)];
        const rawReward = Math.round(WHEEL_ENTRY_COST * multiplier);
        const reward = applyBonus(rawReward, bonusMultiplier);
        const balanceAfter = await modifyBalance(userId, reward);
        const netGain = reward - WHEEL_ENTRY_COST;
        const wheelNote = multiplier ? `${multiplier.toFixed(1)}x çarpan` : 'Çark ödül vermedi';

        await recordEconomyEvent({
          userId,
          guildId,
          executorId: message.author.id,
          type: 'wheel',
          amount: netGain,
          balanceAfter,
          note: wheelNote
        });

        if (message.inGuild()) {
          await logEconomyChange(message.client, message.guildId, {
            userId,
            executorId: message.author.id,
            amount: netGain,
            balanceAfter,
            type: resolveTypeLabel('wheel'),
            note: wheelNote
          });
        }

        const lines = [
          `Giriş ücreti: **${formatAmount(WHEEL_ENTRY_COST)}**`,
          multiplier
            ? `Çark ${multiplier.toFixed(1)}x çarpan verdi ve **${formatAmount(reward)}** kazandın.`
            : 'Çark bu turda ödül vermedi.'
        ];

        if (netGain >= 0) {
          lines.push(`Net kazancın: **${formatAmount(netGain)}** • Yeni bakiye: ${formatAmount(balanceAfter)}`);
        } else {
          lines.push(`Net kaybın: **${formatAmount(Math.abs(netGain))}** • Yeni bakiye: ${formatAmount(balanceAfter)}`);
        }

        await message.reply({ content: `🌀 ${lines.join('\n')}`, allowedMentions: { repliedUser: false } });
        return;
      }

      if (['arena', 'duel', 'düello'].includes(action)) {
        const profile = await getEconomyProfile(userId);
        if (profile.balance < ARENA_ENTRY_COST) {
          await message.reply({
            content: `⚔️ Arenaya girmek için **${formatAmount(ARENA_ENTRY_COST)}** gerekiyor. Bakiyen ${formatAmount(profile.balance)}.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        const availability = await canUseAction(userId, 'duel', ARENA_COOLDOWN);
        if (!availability.available) {
          await message.reply({
            content: `⚔️ Arenaya tekrar girmeden önce **${formatDuration(availability.remaining)}** beklemelisin.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        await recordActionUsage(userId, 'duel');
        await incrementStat(userId, 'arenaMatches', 1);

        await modifyBalance(userId, -ARENA_ENTRY_COST);
        const success = Math.random() < 0.55;
        let reward = 0;
        let note = 'Maç kaybedildi.';

        if (success) {
          const rawReward = pickRandom(ARENA_REWARD_RANGE[0], ARENA_REWARD_RANGE[1]);
          reward = applyBonus(rawReward, bonusMultiplier);
          await incrementStat(userId, 'arenaWins', 1);
          note = 'Arena karşılaşmasını kazandın!';
        }

        const balanceAfter = await modifyBalance(userId, reward);
        const netGain = reward - ARENA_ENTRY_COST;

        await recordEconomyEvent({
          userId,
          guildId,
          executorId: message.author.id,
          type: 'duel',
          amount: netGain,
          balanceAfter,
          note
        });

        if (message.inGuild()) {
          await logEconomyChange(message.client, message.guildId, {
            userId,
            executorId: message.author.id,
            amount: netGain,
            balanceAfter,
            type: resolveTypeLabel('duel'),
            note
          });
        }

        const lines = [
          `Giriş ücreti: **${formatAmount(ARENA_ENTRY_COST)}**`,
          success
            ? `🏆 ${note} Ödülün **${formatAmount(reward)}** olarak bakiyene eklendi.`
            : '😖 Arena mücadelesi kaybedildi; giriş ücretini kaybettin.'
        ];

        if (netGain >= 0) {
          lines.push(`Net kazancın: **${formatAmount(netGain)}** • Yeni bakiye: ${formatAmount(balanceAfter)}`);
        } else {
          lines.push(`Net kaybın: **${formatAmount(Math.abs(netGain))}** • Yeni bakiye: ${formatAmount(balanceAfter)}`);
        }

        await message.reply({ content: `⚔️ ${lines.join('\n')}`, allowedMentions: { repliedUser: false } });
        return;
      }

      if (['yatirim', 'yatırım', 'invest'].includes(action)) {
        const amountInput = args.shift();
        const parsedAmount = Number.parseInt(amountInput ?? '', 10);

        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
          await message.reply({
            content: '📉 Lütfen yatırım miktarını sayı olarak belirt.',
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        const minimum = applyBonus(INVESTMENT_MINIMUM, bonusMultiplier);
        const amount = applyBonus(parsedAmount, bonusMultiplier);
        if (amount < minimum) {
          await message.reply({
            content: `📉 En az ${formatAmount(minimum)} yatırarak deneme yapabilirsin.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        const profile = await getEconomyProfile(userId);
        if (amount > profile.balance) {
          await message.reply({
            content: `💳 Yatırım için **${formatAmount(amount)}** gerekli. Şu anki bakiyen ${formatAmount(profile.balance)}.`,
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
        const finalBalance = refreshed.balance;

        await recordEconomyEvent({
          userId,
          guildId,
          executorId: message.author.id,
          type: 'investment',
          amount: netChange,
          balanceAfter: finalBalance,
          note: outcome.message
        });

        if (message.inGuild()) {
          await logEconomyChange(message.client, message.guildId, {
            userId,
            executorId: message.author.id,
            amount: netChange,
            balanceAfter: finalBalance,
            type: resolveTypeLabel('investment'),
            note: outcome.message
          });
        }

        const embed = new EmbedBuilder()
          .setColor(outcome.success ? 0x2ecc71 : 0xe74c3c)
          .setTitle('📈 Yatırım Değerlendirmesi')
          .setDescription(outcome.message)
          .addFields(
            { name: 'Yatırım Miktarı', value: formatAmount(amount), inline: true },
            {
              name: outcome.success ? 'Net Kazanç' : 'Net Kayıp',
              value: `${netChange >= 0 ? '+' : '-'}${formatAmount(Math.abs(netChange))}`,
              inline: true
            },
            { name: 'Güncel Bakiye', value: formatAmount(refreshed.balance), inline: true }
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
            content: `💸 Bakiye yetersiz. Şu anda en fazla **${formatAmount(profile.balance)}** gönderebilirsin.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        const senderBalance = await modifyBalance(userId, -amount);
        const recipientBalance = await modifyBalance(target.id, amount);
        await incrementStat(userId, 'giftsSent', 1);
        await incrementStat(target.id, 'giftsReceived', 1);

        const senderNote = `Alıcı: ${target.username ?? target.tag ?? target.id}`;
        const recipientNote = `Gönderen: ${message.author.username ?? message.author.tag ?? message.author.id}`;

        await recordEconomyEvent({
          userId,
          guildId,
          executorId: message.author.id,
          type: 'gift_sent',
          amount: -amount,
          balanceAfter: senderBalance,
          note: senderNote
        });

        await recordEconomyEvent({
          userId: target.id,
          guildId,
          executorId: message.author.id,
          type: 'gift_received',
          amount,
          balanceAfter: recipientBalance,
          note: recipientNote
        });

        if (message.inGuild()) {
          await logEconomyChange(message.client, message.guildId, {
            userId,
            executorId: message.author.id,
            amount: -amount,
            balanceAfter: senderBalance,
            type: resolveTypeLabel('gift_sent'),
            note: senderNote
          });

          await logEconomyChange(message.client, message.guildId, {
            userId: target.id,
            executorId: message.author.id,
            amount,
            balanceAfter: recipientBalance,
            type: resolveTypeLabel('gift_received'),
            note: recipientNote
          });
        }

        await message.reply({
          content: `🎁 ${userMention(target.id)} üyesine **${formatAmount(amount)}** gönderdin.`,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      if (['ayar', 'ayarlar', 'config'].includes(action)) {
        if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
          await message.reply({
            content: '⚙️ Ekonomi ayarlarını düzenlemek için **Sunucuyu Yönet** yetkisine sahip olmalısın.',
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        const subAction = (args.shift() ?? '').toLowerCase();

        if (!subAction || ['goster', 'göster', 'detay', 'bilgi'].includes(subAction)) {
          const summary = await describeEconomyConfig(guildId);
          const previewAmount = applyBonus(150, summary.bonusMultiplier);
          const embed = new EmbedBuilder()
            .setColor(0x00b894)
            .setTitle('⚙️ Ekonomi Ayarları')
            .setDescription('Geçerli ekonomi ayarları aşağıda listelendi. Değerleri güncellemek için alt komutları kullan.')
            .addFields(
              { name: 'Para Birimi', value: `${summary.name} (${summary.symbol})`, inline: true },
              { name: 'Ödül Çarpanı', value: `×${summary.bonusMultiplier.toFixed(1)}`, inline: true },
              { name: 'Örnek Ödül', value: `150 → ${formatCurrency(previewAmount, summary)}`, inline: true }
            )
            .setTimestamp();

          await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
          return;
        }

        if (['isim', 'ad', 'name'].includes(subAction)) {
          const nextName = args.join(' ').trim();
          if (!nextName) {
            await message.reply({
              content: '⚙️ Yeni para birimi adını yazmalısın. Örnek: `ekonomi ayar isim FurCoin`.',
              allowedMentions: { repliedUser: false }
            });
            return;
          }

          await setEconomyCurrency(guildId, { name: nextName, symbol: economyConfig.currencySymbol });
        } else if (['sembol', 'simge', 'symbol'].includes(subAction)) {
          const nextSymbol = args.shift();
          if (!nextSymbol) {
            await message.reply({
              content: '⚙️ Yeni sembol veya emojiyi yazmalısın. Örnek: `ekonomi ayar sembol 💎`.',
              allowedMentions: { repliedUser: false }
            });
            return;
          }

          await setEconomyCurrency(guildId, { name: economyConfig.currencyName, symbol: nextSymbol });
        } else if (['bonus', 'carpan', 'çarpan', 'multiplier'].includes(subAction)) {
          const multiplierInput = args.shift();
          const parsedMultiplier = Number.parseFloat(multiplierInput ?? '');
          if (!Number.isFinite(parsedMultiplier)) {
            await message.reply({
              content: '⚙️ Ödül çarpanı 0.5 ile 3 arasında bir sayı olmalıdır.',
              allowedMentions: { repliedUser: false }
            });
            return;
          }

          await setEconomyBonusMultiplier(guildId, parsedMultiplier);
        } else {
          await message.reply({
            content: '⚙️ Geçersiz alt komut. `ekonomi ayar goster`, `ekonomi ayar isim <ad>`, `ekonomi ayar sembol <emoji>` veya `ekonomi ayar bonus <0.5-3>` kullanabilirsin.',
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        economyConfig = await getEconomyConfig(guildId);
        formatAmount = createCurrencyFormatter(economyConfig);
        bonusMultiplier = economyConfig.bonusMultiplier ?? 1;

        const summary = await describeEconomyConfig(guildId);
        const previewAmount = applyBonus(150, summary.bonusMultiplier);
        const embed = new EmbedBuilder()
          .setColor(0x16a085)
          .setTitle('✅ Ekonomi Ayarları Güncellendi')
          .setDescription('Yeni değerler kaydedildi. Değişiklikler tüm ekonomi komutlarına uygulandı.')
          .addFields(
            { name: 'Para Birimi', value: `${summary.name} (${summary.symbol})`, inline: true },
            { name: 'Ödül Çarpanı', value: `×${summary.bonusMultiplier.toFixed(1)}`, inline: true },
            { name: 'Örnek Ödül', value: `150 → ${formatCurrency(previewAmount, summary)}`, inline: true }
          )
          .setTimestamp();

        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        return;
      }

      if (['market', 'magaza', 'mağaza'].includes(action)) {
        const category = args.shift() ?? 'all';
        const embed = buildMarketEmbed(formatAmount, currencyName, category);
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

        const cost = applyBonus(item.price * quantity, bonusMultiplier);
        const profile = await getEconomyProfile(userId);
        if (cost > profile.balance) {
          await message.reply({
            content: `💳 Bu alışveriş için **${formatAmount(cost)}** gerekiyor. Bakiyen: **${formatAmount(profile.balance)}**.`,
            allowedMentions: { repliedUser: false }
          });
          return;
        }

        const balanceAfter = await modifyBalance(userId, -cost);
        const result = await addInventoryItem(userId, item.id, quantity);

        const purchaseNote = `${item.name} × ${quantity}`;

        await recordEconomyEvent({
          userId,
          guildId,
          executorId: message.author.id,
          type: 'purchase',
          amount: -cost,
          balanceAfter,
          note: purchaseNote
        });

        if (message.inGuild()) {
          await logEconomyChange(message.client, message.guildId, {
            userId,
            executorId: message.author.id,
            amount: -cost,
            balanceAfter,
            type: resolveTypeLabel('purchase'),
            note: purchaseNote
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0x8e44ad)
          .setTitle('🛍️ Alışveriş Başarılı')
          .setDescription(
            `${item.name} ürününden ${quantity} adet aldın. Toplam tutar: ${formatAmount(cost)}. Yeni bakiye: ${formatAmount(balanceAfter)}.`
          )
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
        const embed = buildLeaderboardEmbed(message.client, leaderboard, formatAmount);
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
