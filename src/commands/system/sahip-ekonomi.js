import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import {
  getEconomyProfile,
  modifyBalance,
  setBalance
} from '../../utils/economyStorage.js';
import { isEconomyBlacklisted } from '../../utils/blacklistStorage.js';
import { recordEconomyEvent } from '../../utils/economyLedgerStorage.js';
import { logEconomyChange } from '../../utils/economyLog.js';

function formatCurrency(amount) {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  return `${safe.toLocaleString('tr-TR')} 💰`;
}

export default {
  category: 'Sistem',
  menuGroup: 'Sahip Araçları',
  ownerOnly: true,
  catalogKey: 'sahip-ekonomi',
  data: new SlashCommandBuilder()
    .setName('sahip-ekonomi')
    .setDescription('Ekonomi bakiyelerini ve raporlarını yönetir.')
    .addSubcommand((sub) =>
      sub
        .setName('ekle')
        .setDescription('Belirtilen üyeye FurCoin ekler.')
        .addUserOption((option) => option.setName('uye').setDescription('Hedef üye').setRequired(true))
        .addIntegerOption((option) =>
          option
            .setName('miktar')
            .setDescription('Eklenecek miktar')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('cikar')
        .setDescription('Belirtilen üyeden FurCoin düşer.')
        .addUserOption((option) => option.setName('uye').setDescription('Hedef üye').setRequired(true))
        .addIntegerOption((option) =>
          option
            .setName('miktar')
            .setDescription('Çıkarılacak miktar')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('ayarla')
        .setDescription('Belirtilen üyenin bakiyesini doğrudan ayarlar.')
        .addUserOption((option) => option.setName('uye').setDescription('Hedef üye').setRequired(true))
        .addIntegerOption((option) =>
          option
            .setName('miktar')
            .setDescription('Yeni bakiye')
            .setRequired(true)
            .setMinValue(0)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('goruntule')
        .setDescription('Bir üyenin ekonomi profilini raporlar.')
        .addUserOption((option) => option.setName('uye').setDescription('Hedef üye').setRequired(true))
    ),
  async execute(interaction) {
    if (interaction.user.id !== interaction.client.ownerId) {
      await interaction.reply({
        content: '⭐ Bu komutu yalnızca Furmin sahibi kullanabilir.',
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('uye', true);
    const guildId = interaction.guildId ?? '';

    if (sub === 'ekle') {
      const amount = interaction.options.getInteger('miktar', true);
      const balance = await modifyBalance(target.id, amount);
      await recordEconomyEvent({
        userId: target.id,
        guildId,
        executorId: interaction.user.id,
        type: 'owner_adjust',
        amount,
        balanceAfter: balance,
        note: 'Sahip tarafından bakiye eklendi.'
      });

      if (interaction.inGuild()) {
        await logEconomyChange(interaction.client, interaction.guildId, {
          userId: target.id,
          executorId: interaction.user.id,
          amount,
          balanceAfter: balance,
          type: 'Sahip İşlemi',
          note: 'Sahip tarafından bakiye eklendi.'
        });
      }

      await interaction.editReply({
        content: `✅ ${target} kullanıcısına **${formatCurrency(amount)}** eklendi. Yeni bakiye: **${formatCurrency(balance)}**.`
      });
      return;
    }

    if (sub === 'cikar') {
      const amount = interaction.options.getInteger('miktar', true);
      const balance = await modifyBalance(target.id, -amount);
      await recordEconomyEvent({
        userId: target.id,
        guildId,
        executorId: interaction.user.id,
        type: 'owner_adjust',
        amount: -amount,
        balanceAfter: balance,
        note: 'Sahip tarafından bakiye düşürüldü.'
      });

      if (interaction.inGuild()) {
        await logEconomyChange(interaction.client, interaction.guildId, {
          userId: target.id,
          executorId: interaction.user.id,
          amount: -amount,
          balanceAfter: balance,
          type: 'Sahip İşlemi',
          note: 'Sahip tarafından bakiye düşürüldü.'
        });
      }
      await interaction.editReply({
        content: `♻️ ${target} kullanıcısından **${formatCurrency(amount)}** düşüldü. Güncel bakiye: **${formatCurrency(balance)}**.`
      });
      return;
    }

    if (sub === 'ayarla') {
      const amount = interaction.options.getInteger('miktar', true);
      const previous = await getEconomyProfile(target.id);
      const balance = await setBalance(target.id, amount);
      const delta = balance - previous.balance;

      await recordEconomyEvent({
        userId: target.id,
        guildId,
        executorId: interaction.user.id,
        type: 'owner_adjust',
        amount: delta,
        balanceAfter: balance,
        note: `Yeni bakiye: ${formatCurrency(balance)}`
      });

      if (interaction.inGuild()) {
        await logEconomyChange(interaction.client, interaction.guildId, {
          userId: target.id,
          executorId: interaction.user.id,
          amount: delta,
          balanceAfter: balance,
          type: 'Sahip İşlemi',
          note: `Yeni bakiye: ${formatCurrency(balance)}`
        });
      }
      await interaction.editReply({
        content: `🧮 ${target} kullanıcısının bakiyesi **${formatCurrency(balance)}** olarak güncellendi.`
      });
      return;
    }

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

    await interaction.editReply({ embeds: [embed] });
  }
};
