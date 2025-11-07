import { EmbedBuilder } from 'discord.js';
import {
  getEconomyProfile,
  modifyBalance,
  setBalance
} from '../../utils/economyStorage.js';
import { isEconomyBlacklisted } from '../../utils/blacklistStorage.js';
import { recordEconomyEvent } from '../../utils/economyLedgerStorage.js';
import { logEconomyChange } from '../../utils/economyLog.js';

const usage =
  'Kullanım: `sahip-ekonomi ekle @kullanici miktar`, `sahip-ekonomi cikar @kullanici miktar`, `sahip-ekonomi ayarla @kullanici miktar`, `sahip-ekonomi goruntule @kullanici`.';

function formatCurrency(amount) {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  return `${safe.toLocaleString('tr-TR')} 💰`;
}

export default {
  name: 'sahip-ekonomi',
  aliases: ['owner-eco', 'furcoin-admin'],
  category: 'Sistem',
  menuGroup: 'Sahip Araçları',
  description: 'Ekonomi bakiyelerini düzenler ve raporlar.',
  ownerOnly: true,
  catalogKey: 'sahip-ekonomi',
  async execute(message, args) {
    if (message.author.id !== message.client.ownerId) {
      await message.reply({
        content: '⭐ Bu komutu yalnızca Furmin sahibi kullanabilir.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const actionRaw = (args.shift() ?? '').toLowerCase();
    const guildId = message.guildId ?? '';
    if (!actionRaw) {
      await message.reply({ content: usage, allowedMentions: { repliedUser: false } });
      return;
    }

    const action = ['ekle', 'add'].includes(actionRaw)
      ? 'ekle'
      : ['cikar', 'çıkar', 'remove'].includes(actionRaw)
      ? 'cikar'
      : ['ayarla', 'set'].includes(actionRaw)
      ? 'ayarla'
      : ['goruntule', 'görüntüle', 'view'].includes(actionRaw)
      ? 'goruntule'
      : null;

    if (!action) {
      await message.reply({
        content: '⚠️ Geçerli bir işlem seçmelisin: `ekle`, `cikar`, `ayarla` veya `goruntule`.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const userToken = args.shift();
    const target = message.mentions.users.first() ?? (await resolveUser(message, userToken));
    if (!target) {
      await message.reply({
        content: '⚠️ Geçerli bir kullanıcı belirtmelisin (etiket veya ID kullan).',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (action === 'goruntule') {
      const profile = await getEconomyProfile(target.id);
      const blocked = await isEconomyBlacklisted(target.id);

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`💰 ${target.username} — Ekonomi Profili`)
        .setDescription('Ekonomi istatistiklerinin özeti aşağıdadır.')
        .addFields(
          { name: 'Bakiye', value: formatCurrency(profile.balance), inline: true },
          { name: 'Günlük Seri', value: `${profile.streak.count} gün`, inline: true },
          { name: 'Durum', value: blocked ? '🚫 Kara listede' : '✅ Aktif', inline: true }
        )
        .addFields(
          {
            name: 'İstatistikler',
            value:
              `• Çalışma: **${profile.stats.work}**\n` +
              `• Macera: **${profile.stats.adventure}**\n` +
              `• Görev: **${profile.stats.quests}**\n` +
              `• Hediyeleşme: **${profile.stats.giftsSent}** gönderildi / **${profile.stats.giftsReceived}** alındı\n` +
              `• Yatırım: **${profile.stats.investmentWins}** kazanç / **${profile.stats.investmentLosses}** kayıp`
          },
          {
            name: 'Envanter',
            value: Object.keys(profile.inventory).length
              ? Object.entries(profile.inventory)
                  .map(([itemId, quantity]) => `• ${itemId}: ${quantity} adet`)
                  .join('\n')
              : 'Envanter boş.'
          }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    const amountRaw = args.shift();
    const amount = Number.parseInt(amountRaw ?? '', 10);
    if (!Number.isFinite(amount) || amount < 0) {
      await message.reply({
        content: '⚠️ Geçerli bir miktar belirtmelisin (0 veya daha büyük bir sayı).',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (action === 'ekle') {
      if (amount < 1) {
        await message.reply({
          content: '⚠️ En az 1 FurCoin ekleyebilirsin.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }
      const balance = await modifyBalance(target.id, amount);
      await recordEconomyEvent({
        userId: target.id,
        guildId,
        executorId: message.author.id,
        type: 'owner_adjust',
        amount,
        balanceAfter: balance,
        note: 'Sahip tarafından bakiye eklendi.'
      });

      if (message.inGuild()) {
        await logEconomyChange(message.client, message.guildId, {
          userId: target.id,
          executorId: message.author.id,
          amount,
          balanceAfter: balance,
          type: 'Sahip İşlemi',
          note: 'Sahip tarafından bakiye eklendi.'
        });
      }

      await message.reply({
        content: `✅ ${target} kullanıcısına **${formatCurrency(amount)}** eklendi. Yeni bakiye: **${formatCurrency(balance)}**.`,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (action === 'cikar') {
      if (amount < 1) {
        await message.reply({
          content: '⚠️ En az 1 FurCoin düşebilirsin.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }
      const balance = await modifyBalance(target.id, -amount);
      await recordEconomyEvent({
        userId: target.id,
        guildId,
        executorId: message.author.id,
        type: 'owner_adjust',
        amount: -amount,
        balanceAfter: balance,
        note: 'Sahip tarafından bakiye düşürüldü.'
      });

      if (message.inGuild()) {
        await logEconomyChange(message.client, message.guildId, {
          userId: target.id,
          executorId: message.author.id,
          amount: -amount,
          balanceAfter: balance,
          type: 'Sahip İşlemi',
          note: 'Sahip tarafından bakiye düşürüldü.'
        });
      }

      await message.reply({
        content: `♻️ ${target} kullanıcısından **${formatCurrency(amount)}** düşüldü. Güncel bakiye: **${formatCurrency(balance)}**.`,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const previous = await getEconomyProfile(target.id);
    const balance = await setBalance(target.id, Math.max(0, amount));
    const delta = balance - previous.balance;

    await recordEconomyEvent({
      userId: target.id,
      guildId,
      executorId: message.author.id,
      type: 'owner_adjust',
      amount: delta,
      balanceAfter: balance,
      note: `Yeni bakiye: ${formatCurrency(balance)}`
    });

    if (message.inGuild()) {
      await logEconomyChange(message.client, message.guildId, {
        userId: target.id,
        executorId: message.author.id,
        amount: delta,
        balanceAfter: balance,
        type: 'Sahip İşlemi',
        note: `Yeni bakiye: ${formatCurrency(balance)}`
      });
    }

    await message.reply({
      content: `🧮 ${target} kullanıcısının bakiyesi **${formatCurrency(balance)}** olarak güncellendi.`,
      allowedMentions: { repliedUser: false }
    });
  }
};

async function resolveUser(message, id) {
  if (!id) return null;
  const cleaned = id.replace(/[^0-9]/g, '');
  if (!cleaned) return null;
  return (
    message.client.users.cache.get(cleaned) ||
    (await message.client.users.fetch(cleaned).catch(() => null))
  );
}
