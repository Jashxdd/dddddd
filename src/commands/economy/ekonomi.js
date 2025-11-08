import { EmbedBuilder, SlashCommandBuilder, userMention } from 'discord.js';
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

const DAILY_BASE_REWARD = 250;
const DAILY_STREAK_BONUS = 35;
const WORK_REWARD_RANGE = [80, 160];
const ADVENTURE_REWARD_RANGE = [120, 260];
const ADVENTURE_FAIL_PENALTY = 40;
const WORK_COOLDOWN = 60 * 60 * 1000; // 1 saat
const ADVENTURE_COOLDOWN = 90 * 60 * 1000; // 1,5 saat

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
  owner_adjust: 'Sahip İşlemi'
};

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

function resolveTypeLabel(type) {
  if (!type) return 'Genel İşlem';
  if (TYPE_LABELS[type]) return TYPE_LABELS[type];
  return type
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildHistoryEmbed(user, entries) {
  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle(`📜 ${user?.username ?? 'Bir Üye'} — Ekonomi Kayıtları`)
    .setTimestamp();

  if (!entries.length) {
    embed.setDescription('Henüz kayıt oluşturulmamış. Ekonomi komutlarını kullanarak geçmişini oluşturabilirsin.');
    return embed;
  }

  const lines = entries.map((entry) => {
    const amountLabel = entry.amount >= 0
      ? `+${formatCurrency(entry.amount)}`
      : `-${formatCurrency(Math.abs(entry.amount))}`;
    const balanceLabel = formatCurrency(entry.balanceAfter);
    const timeLabel = entry.timestamp ? `<t:${Math.floor(entry.timestamp / 1000)}:R>` : 'Bilinmiyor';
    const noteLine = entry.note ? `\n    ↳ ${entry.note}` : '';
    return `• **${resolveTypeLabel(entry.type)}** • ${amountLabel} • Bakiye: ${balanceLabel} • ${timeLabel}${noteLine}`;
  });

  embed.setDescription(lines.join('\n'));
  return embed;
}

function buildProfileEmbed(user, profile) {
  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`💰 ${user?.username ?? 'Bir Üye'} — Ekonomi Profili`)
    .setThumbnail(user?.displayAvatarURL({ size: 256 }) ?? null)
    .addFields(
      { name: 'Bakiye', value: formatCurrency(profile.balance), inline: true },
      { name: 'Günlük Seri', value: `${profile.streak.count} gün`, inline: true },
      {
        name: 'İstatistikler',
        value:
          `• Çalışma: **${profile.stats.work}** kez\n` +
          `• Macera: **${profile.stats.adventure}** kez\n` +
          `• Görev: **${profile.stats.quests}** tamamlandı\n` +
          `• Hediyeleşme: **${profile.stats.giftsSent}** gönderildi / **${profile.stats.giftsReceived}** alındı\n` +
          `• Yatırım: **${profile.stats.investmentWins}** kazanç / **${profile.stats.investmentLosses}** kayıp`
      }
    )
    .setFooter({ text: 'Furmin Ekonomi — Kazançlarını akıllıca kullan!' })
    .setTimestamp();
}

function buildMarketEmbed() {
  const embed = new EmbedBuilder()
    .setColor(0x27ae60)
    .setTitle('🛒 Furmin Marketi')
    .setDescription('Satın alabileceğin özel eşyalar ve etkileri:');

  economyItems.forEach((item) => {
    embed.addFields({
      name: `${item.name} — ${formatCurrency(item.price)}`,
      value: item.description
    });
  });

  return embed;
}

function buildInventoryEmbed(user, inventory) {
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`🎒 ${user?.username ?? 'Bir Üye'} — Envanter`)
    .setTimestamp();

  const entries = Object.entries(inventory);
  if (!entries.length) {
    embed.setDescription('Envanterinde henüz eşya yok. Marketten alışveriş yapmayı deneyebilirsin.');
    return embed;
  }

  const lines = entries
    .map(([itemId, quantity]) => {
      const item = findEconomyItem(itemId);
      const label = item ? item.name : `Bilinmeyen ürün (${itemId})`;
      return `• **${label}** × ${quantity}`;
    })
    .join('\n');

  embed.setDescription(lines);
  return embed;
}

function buildLeaderboardEmbed(client, entries) {
  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('🏆 Furmin Zenginler Kulübü')
    .setDescription('En yüksek bakiyeye sahip 10 üye:')
    .setTimestamp();

  if (!entries.length) {
    embed.setDescription('Henüz listeye girecek kimse yok. İlk sen olabilirsin!');
    return embed;
  }

  const lines = entries.map((entry, index) => {
    const user = client.users.cache.get(entry.userId);
    const label = user ? `${user.username} (${userMention(entry.userId)})` : `Bilinmeyen Üye (${entry.userId})`;
    return `**${index + 1}.** ${label} — ${formatCurrency(entry.balance)}`;
  });

  embed.setDescription(lines.join('\n'));
  return embed;
}

function registerItemChoices(option) {
  economyItems.slice(0, 25).forEach((item) => {
    option.addChoices({ name: `${item.name} (${item.price} 💰)`, value: item.id });
  });
  return option;
}

const data = new SlashCommandBuilder()
  .setName('ekonomi')
  .setDescription('Furmin ekonomi sisteminde kazançlarını yönet.')
  .addSubcommand((sub) =>
    sub
      .setName('bakiye')
      .setDescription('Belirtilen üyenin FurCoin bakiyesini gösterir.')
      .addUserOption((option) => option.setName('uye').setDescription('Bakiyesini görmek istediğin üye.'))
  )
  .addSubcommand((sub) =>
    sub
      .setName('kayit')
      .setDescription('Son ekonomi işlemlerini listeler.')
      .addUserOption((option) => option.setName('uye').setDescription('Kayıtları görüntülenecek üye.'))
      .addIntegerOption((option) =>
        option
          .setName('limit')
          .setDescription('Gösterilecek kayıt sayısı (1-10)')
          .setMinValue(1)
          .setMaxValue(10)
      )
  )
  .addSubcommand((sub) => sub.setName('gunluk').setDescription('Günlük FurCoin ödülünü toplar.'))
  .addSubcommand((sub) => sub.setName('calis').setDescription('Kısa bir mesai yaparak FurCoin kazan.'))
  .addSubcommand((sub) => sub.setName('macera').setDescription('Macera ile sürpriz ödüller kazanmayı dene.'))
  .addSubcommand((sub) => sub.setName('gorev').setDescription('Günlük bir Furmin görevi tamamla.'))
  .addSubcommand((sub) =>
    sub
      .setName('yatirim')
      .setDescription('FurCoin bakiyenden yatırım yapıp şansını dene.')
      .addIntegerOption((option) =>
        option
          .setName('miktar')
          .setDescription('Yatırıma ayıracağın miktar')
          .setRequired(true)
          .setMinValue(INVESTMENT_MINIMUM)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('hediye')
      .setDescription('FurCoin bakiyenden bir üyeye hediye gönder.')
      .addUserOption((option) => option.setName('uye').setDescription('Hediye göndereceğin üye').setRequired(true))
      .addIntegerOption((option) =>
        option
          .setName('miktar')
          .setDescription('Göndermek istediğin miktar')
          .setRequired(true)
          .setMinValue(1)
      )
  )
  .addSubcommand((sub) => sub.setName('market').setDescription('Satın alabileceğin market ürünlerini listeler.'))
  .addSubcommand((sub) =>
    sub
      .setName('satinal')
      .setDescription('Market ürünlerinden satın alır.')
      .addStringOption((option) => registerItemChoices(option.setName('urun').setDescription('Satın alınacak ürün').setRequired(true)))
      .addIntegerOption((option) =>
        option.setName('adet').setDescription('Satın alınacak adet').setMinValue(1).setMaxValue(10).setRequired(false)
      )
  )
  .addSubcommand((sub) => sub.setName('envanter').setDescription('Envanterinde bulunan ürünleri gösterir.'))
  .addSubcommand((sub) => sub.setName('liderlik').setDescription('En zengin Furmin kullanıcılarını gösterir.'));

export default {
  category: 'Ekonomi',
  menuGroup: 'Ekonomi Sistemleri',
  deferEphemeral: true,
  data,
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guildId ?? '';

    if (await isEconomyBlacklisted(userId)) {
      await interaction.editReply({
        content:
          '⛔ Ekonomi özelliklerine erişimin kapatıldı. Daha fazla bilgi almak için Furmin sahibine ulaşmalısın.'
      });
      return;
    }

    try {
      if (subcommand === 'bakiye') {
        const target = interaction.options.getUser('uye') ?? interaction.user;
        const profile = await getEconomyProfile(target.id);
        const embed = buildProfileEmbed(target, profile);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === 'kayit') {
        const target = interaction.options.getUser('uye') ?? interaction.user;
        const limit = interaction.options.getInteger('limit') ?? 5;
        const history = await getUserEconomyHistory(target.id, { limit });
        const embed = buildHistoryEmbed(target, history);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === 'gunluk') {
        const check = await canClaimDaily(userId);
        if (!check.available) {
          await interaction.editReply({
            content: `⏳ Günlük ödülün hazır değil. Tekrar denemeden önce yaklaşık **${formatDuration(check.remaining)}** beklemelisin.`
          });
          return;
        }

        const streakInfo = await recordDailyClaim(userId);
        const streakBonus = Math.min(DAILY_STREAK_BONUS * (streakInfo.count - 1), 350);
        const totalReward = DAILY_BASE_REWARD + Math.max(0, streakBonus);
        const balanceAfter = await modifyBalance(userId, totalReward);
        await incrementStat(userId, 'work', 0); // Seriyi güncellemek için kayıt

        await recordEconomyEvent({
          userId,
          guildId,
          executorId: interaction.user.id,
          type: 'daily',
          amount: totalReward,
          balanceAfter,
          note: streakBonus > 0 ? `Seri bonusu: ${formatCurrency(streakBonus)}` : undefined
        });

        if (interaction.inGuild()) {
          await logEconomyChange(interaction.client, interaction.guildId, {
            userId,
            executorId: interaction.user.id,
            amount: totalReward,
            balanceAfter,
            type: resolveTypeLabel('daily'),
            note: `Günlük seri: ${streakInfo.count} gün`
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('📆 Günlük Ödül Tamamlandı')
          .setDescription(
            `Bugünkü ödülün **${formatCurrency(totalReward)}** oldu. Günlük serin **${streakInfo.count}** gün olarak güncellendi.`
          )
          .setFooter({ text: 'Her gün kontrol ederek bonusunu büyüt!' })
          .setTimestamp();

        if (streakBonus > 0) {
          embed.addFields({ name: 'Seri Bonusu', value: `Ek kazanç: ${formatCurrency(streakBonus)}` });
        }

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === 'calis') {
        const availability = await canUseAction(userId, 'work', WORK_COOLDOWN);
        if (!availability.available) {
          await interaction.editReply({
            content: `💼 Şimdilik dinlenmelisin. Tekrar çalışmadan önce **${formatDuration(availability.remaining)}** bekle.`
          });
          return;
        }

        const reward = pickRandom(WORK_REWARD_RANGE[0], WORK_REWARD_RANGE[1]);
        const balanceAfter = await modifyBalance(userId, reward);
        await incrementStat(userId, 'work', 1);
        await recordActionUsage(userId, 'work');

        await recordEconomyEvent({
          userId,
          guildId,
          executorId: interaction.user.id,
          type: 'work',
          amount: reward,
          balanceAfter
        });

        if (interaction.inGuild()) {
          await logEconomyChange(interaction.client, interaction.guildId, {
            userId,
            executorId: interaction.user.id,
            amount: reward,
            balanceAfter,
            type: resolveTypeLabel('work')
          });
        }

        await interaction.editReply({
          content: `💼 Mesaiyi tamamladın! Kazancın **${formatCurrency(reward)}** olarak bakiyene eklendi.`
        });
        return;
      }

      if (subcommand === 'macera') {
        const availability = await canUseAction(userId, 'adventure', ADVENTURE_COOLDOWN);
        if (!availability.available) {
          await interaction.editReply({
            content: `🧭 Maceraya çıkmadan önce biraz dinlenmelisin. Tekrar denemek için **${formatDuration(availability.remaining)}** bekle.`
          });
          return;
        }

        const success = Math.random() < 0.7;
        await recordActionUsage(userId, 'adventure');
        await incrementStat(userId, 'adventure', 1);

        if (success) {
          const reward = pickRandom(ADVENTURE_REWARD_RANGE[0], ADVENTURE_REWARD_RANGE[1]);
          const balanceAfter = await modifyBalance(userId, reward);
          await recordEconomyEvent({
            userId,
            guildId,
            executorId: interaction.user.id,
            type: 'adventure',
            amount: reward,
            balanceAfter
          });

          if (interaction.inGuild()) {
            await logEconomyChange(interaction.client, interaction.guildId, {
              userId,
              executorId: interaction.user.id,
              amount: reward,
              balanceAfter,
              type: resolveTypeLabel('adventure'),
              note: 'Macera başarıyla tamamlandı.'
            });
          }
          await interaction.editReply({
            content: `🗺️ Macera başarılı! Hazine sandığından **${formatCurrency(reward)}** topladın.`
          });
        } else {
          const penalty = pickRandom(10, ADVENTURE_FAIL_PENALTY);
          const balanceAfter = await modifyBalance(userId, -penalty);
          await recordEconomyEvent({
            userId,
            guildId,
            executorId: interaction.user.id,
            type: 'adventure_fail',
            amount: -penalty,
            balanceAfter
          });

          if (interaction.inGuild()) {
            await logEconomyChange(interaction.client, interaction.guildId, {
              userId,
              executorId: interaction.user.id,
              amount: -penalty,
              balanceAfter,
              type: resolveTypeLabel('adventure_fail'),
              note: 'Macera sırasında kayıp yaşandı.'
            });
          }
          await interaction.editReply({
            content: `💥 Macera sırasında küçük bir kaza yaşandı. Tamir masrafı olarak **${formatCurrency(penalty)}** kaybettin.`
          });
        }
        return;
      }

      if (subcommand === 'gorev') {
        const availability = await canUseAction(userId, 'quest', QUEST_COOLDOWN);
        if (!availability.available) {
          await interaction.editReply({
            content: `🗒️ Yeni göreve başlamadan önce **${formatDuration(availability.remaining)}** beklemelisin.`
          });
          return;
        }

        const scenario = pickQuestScenario();
        const reward = calculateQuestReward();

        await recordActionUsage(userId, 'quest');
        await incrementStat(userId, 'quests', 1);
        const balanceAfter = await modifyBalance(userId, reward);

        await recordEconomyEvent({
          userId,
          guildId,
          executorId: interaction.user.id,
          type: 'quest',
          amount: reward,
          balanceAfter,
          note: scenario.prompt
        });

        if (interaction.inGuild()) {
          await logEconomyChange(interaction.client, interaction.guildId, {
            userId,
            executorId: interaction.user.id,
            amount: reward,
            balanceAfter,
            type: resolveTypeLabel('quest'),
            note: scenario.result
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0x1abc9c)
          .setTitle('🗒️ Günlük Görev Tamamlandı')
          .setDescription(`• Görev: ${scenario.prompt}\n• Sonuç: ${scenario.result}`)
          .addFields({ name: 'Kazanç', value: formatCurrency(reward) })
          .setFooter({ text: 'Görevler 6 saat arayla yenilenir.' })
          .setTimestamp();

        const profile = await getEconomyProfile(userId);
        embed.addFields({ name: 'Güncel Bakiye', value: formatCurrency(profile.balance), inline: true });

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === 'yatirim') {
        const amount = interaction.options.getInteger('miktar', true);
        if (amount < INVESTMENT_MINIMUM) {
          await interaction.editReply({
            content: `📉 En az ${formatCurrency(INVESTMENT_MINIMUM)} yatırarak deneme yapabilirsin.`
          });
          return;
        }

        const profile = await getEconomyProfile(userId);
        if (amount > profile.balance) {
          await interaction.editReply({
            content: `💳 Yatırım için **${formatCurrency(amount)}** gerekli, bakiyen ise ${formatCurrency(profile.balance)}.`
          });
          return;
        }

        const availability = await canUseAction(userId, 'investment', INVESTMENT_COOLDOWN);
        if (!availability.available) {
          await interaction.editReply({
            content: `⏳ Yeni bir yatırım yapmadan önce **${formatDuration(availability.remaining)}** beklemelisin.`
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
        const refreshedProfile = await getEconomyProfile(userId);
        const finalBalance = refreshedProfile.balance;

        await recordEconomyEvent({
          userId,
          guildId,
          executorId: interaction.user.id,
          type: 'investment',
          amount: netChange,
          balanceAfter: finalBalance,
          note: outcome.message
        });

        if (interaction.inGuild()) {
          await logEconomyChange(interaction.client, interaction.guildId, {
            userId,
            executorId: interaction.user.id,
            amount: netChange,
            balanceAfter: finalBalance,
            type: resolveTypeLabel('investment'),
            note: outcome.message
          });
        }

        const embed = new EmbedBuilder()
          .setColor(outcome.success ? 0x2ecc71 : 0xe74c3c)
          .setTitle('📈 Yatırım Sonucu')
          .setDescription(outcome.message)
          .addFields(
            { name: 'Yatırım Miktarı', value: formatCurrency(amount), inline: true },
            {
              name: outcome.success ? 'Net Kazanç' : 'Net Kayıp',
              value: `${netChange >= 0 ? '+' : '-'}${formatCurrency(Math.abs(netChange))}`,
              inline: true
            },
            { name: 'Güncel Bakiye', value: formatCurrency(refreshedProfile.balance), inline: true }
          )
          .setFooter({ text: 'Yatırım denemeleri 30 dakikada bir yapılabilir.' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === 'hediye') {
        const target = interaction.options.getUser('uye', true);
        const amount = interaction.options.getInteger('miktar', true);

        if (target.id === userId) {
          await interaction.editReply({ content: '🎁 Kendine hediye gönderemezsin. Başka bir üyeyi seçmelisin.' });
          return;
        }

        const profile = await getEconomyProfile(userId);
        if (amount > profile.balance) {
          await interaction.editReply({
            content: `💸 Yetersiz bakiye. Şu anda sadece **${formatCurrency(profile.balance)}** gönderebilirsin.`
          });
          return;
        }

        const senderBalance = await modifyBalance(userId, -amount);
        const recipientBalance = await modifyBalance(target.id, amount);
        await incrementStat(userId, 'giftsSent', 1);
        await incrementStat(target.id, 'giftsReceived', 1);

        const senderNote = `Alıcı: ${target.username ?? target.tag ?? target.id}`;
        const recipientNote = `Gönderen: ${interaction.user.username ?? interaction.user.tag ?? interaction.user.id}`;

        await recordEconomyEvent({
          userId,
          guildId,
          executorId: interaction.user.id,
          type: 'gift_sent',
          amount: -amount,
          balanceAfter: senderBalance,
          note: senderNote
        });

        await recordEconomyEvent({
          userId: target.id,
          guildId,
          executorId: interaction.user.id,
          type: 'gift_received',
          amount,
          balanceAfter: recipientBalance,
          note: recipientNote
        });

        if (interaction.inGuild()) {
          await logEconomyChange(interaction.client, interaction.guildId, {
            userId,
            executorId: interaction.user.id,
            amount: -amount,
            balanceAfter: senderBalance,
            type: resolveTypeLabel('gift_sent'),
            note: senderNote
          });

          await logEconomyChange(interaction.client, interaction.guildId, {
            userId: target.id,
            executorId: interaction.user.id,
            amount,
            balanceAfter: recipientBalance,
            type: resolveTypeLabel('gift_received'),
            note: recipientNote
          });
        }

        await interaction.editReply({
          content: `🎁 ${userMention(target.id)} üyesine **${formatCurrency(amount)}** gönderdin. Paylaşmak güzeldir!`
        });
        return;
      }

      if (subcommand === 'market') {
        const embed = buildMarketEmbed();
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === 'satinal') {
        const itemId = interaction.options.getString('urun', true);
        const quantity = interaction.options.getInteger('adet') ?? 1;
        const item = findEconomyItem(itemId);

        if (!item) {
          await interaction.editReply({
            content: '❓ Seçilen ürün bulunamadı. Marketten geçerli bir ürün seçtiğinden emin ol.'
          });
          return;
        }

        const totalCost = item.price * quantity;
        const profile = await getEconomyProfile(userId);
        if (totalCost > profile.balance) {
          await interaction.editReply({
            content: `💳 Bu alışveriş için **${formatCurrency(totalCost)}** gerekiyor. Bakiyen **${formatCurrency(profile.balance)}**.`
          });
          return;
        }

        const balanceAfter = await modifyBalance(userId, -totalCost);
        const inventory = await addInventoryItem(userId, item.id, quantity);

        const purchaseNote = `${item.name} × ${quantity}`;

        await recordEconomyEvent({
          userId,
          guildId,
          executorId: interaction.user.id,
          type: 'purchase',
          amount: -totalCost,
          balanceAfter,
          note: purchaseNote
        });

        if (interaction.inGuild()) {
          await logEconomyChange(interaction.client, interaction.guildId, {
            userId,
            executorId: interaction.user.id,
            amount: -totalCost,
            balanceAfter,
            type: resolveTypeLabel('purchase'),
            note: purchaseNote
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0x8e44ad)
          .setTitle('🛍️ Alışveriş Tamamlandı')
          .setDescription(
            `**${item.name}** ürününden ${quantity} adet satın aldın. Yeni bakiyen **${formatCurrency(balanceAfter)}**.`
          )
          .addFields({ name: 'Envanter Durumu', value: `${item.name}: ${inventory.total} adet` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === 'envanter') {
        const inventory = await getInventory(userId);
        const embed = buildInventoryEmbed(interaction.user, inventory);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === 'liderlik') {
        const leaderboard = await getLeaderboard(10);
        const embed = buildLeaderboardEmbed(interaction.client, leaderboard);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      await interaction.editReply({ content: '⚠️ Tanımlanamayan ekonomi alt komutu çağrıldı.' });
    } catch (error) {
      console.error('Ekonomi komutu çalışırken hata oluştu:', error);
      await interaction.editReply({
        content: '⚠️ Ekonomi işlemi sırasında beklenmeyen bir hata oluştu. Lütfen tekrar dene veya destek sunucusuna bildir.'
      });
    }
  }
};
