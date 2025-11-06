import { EmbedBuilder, time } from 'discord.js';
import {
  addParticipant,
  createGiveaway,
  endGiveaway,
  getGiveaway,
  getGiveawayMap,
  listActiveGiveaways,
  removeParticipant,
  updateGiveaway
} from './giveawayStorage.js';
import { sendModerationLog } from './modLog.js';
import { sendDetailedLog } from './detailedLog.js';

let schedulerActive = false;
let schedulerInterval = null;

function pickWinners(participants, winnerCount) {
  const pool = Array.isArray(participants) ? [...new Set(participants)] : [];
  if (!pool.length) return [];
  const winners = [];
  while (winners.length < winnerCount && pool.length) {
    const index = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(index, 1)[0]);
  }
  return winners;
}

async function finalizeGiveaway(client, giveaway, options = {}) {
  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    await endGiveaway(giveaway.guildId, giveaway.id, []);
    return;
  }

  const winners = pickWinners(giveaway.participants, giveaway.winners ?? 1);
  await endGiveaway(giveaway.guildId, giveaway.id, winners);

  const mentionWinners = winners.length ? winners.map((id) => `<@${id}>`).join(', ') : 'Kazanan çıkmadı.';

  if (giveaway.messageId) {
    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (message) {
      const embed = EmbedBuilder.from(message.embeds?.[0] ?? new EmbedBuilder());
      embed.setColor(0x2ecc71);
      embed.addFields({ name: 'Kazananlar', value: mentionWinners });
      embed.setFooter({ text: 'Çekiliş tamamlandı.' });
      await message.edit({ embeds: [embed], components: [] }).catch(() => null);
    }
  }

  await channel
    .send({ content: `🎉 **${giveaway.prize}** çekilişi tamamlandı! Kazananlar: ${mentionWinners}` })
    .catch(() => null);

  const reason = options.reason ?? 'Süre dolduğu için sonuçlandırıldı.';

  await sendModerationLog(client, giveaway.guildId, {
    action: 'Çekiliş Sonuçlandı',
    description: `🎉 **${giveaway.prize}** çekilişi tamamlandı. ${reason}`,
    color: 0x2ecc71,
    extraFields: [
      { name: 'Kanal', value: channel.toString(), inline: true },
      { name: 'Kazananlar', value: mentionWinners, inline: false }
    ]
  });

  await sendDetailedLog(client, giveaway.guildId, 'general', {
    title: '🎉 Çekiliş Tamamlandı',
    description: `**${giveaway.prize}** ödüllü çekiliş sonuçlandı.`,
    fields: [
      { name: 'Kanal', value: channel.toString(), inline: true },
      { name: 'Kazananlar', value: mentionWinners, inline: false },
      { name: 'Not', value: reason, inline: false }
    ]
  });
}

async function sweepGiveaways(client) {
  const map = await getGiveawayMap();
  const now = Date.now();

  for (const guildGiveaways of Object.values(map)) {
    for (const giveaway of Object.values(guildGiveaways)) {
      if (giveaway.ended) continue;
      if (giveaway.endsAt && giveaway.endsAt <= now) {
        await finalizeGiveaway(client, giveaway);
      }
    }
  }
}

export function startGiveawayScheduler(client) {
  if (schedulerActive) return;
  schedulerActive = true;
  schedulerInterval = setInterval(() => {
    sweepGiveaways(client).catch((error) => {
      console.error('Çekiliş denetleyicisi çalıştırılırken hata oluştu:', error);
    });
  }, 60_000);
  if (schedulerInterval.unref) {
    schedulerInterval.unref();
  }
}

export async function handleGiveawayJoin(interaction, giveawayId) {
  const giveaway = await getGiveaway(interaction.guildId, giveawayId);
  if (!giveaway) {
    await interaction.reply({ content: 'Çekiliş bulunamadı veya sona erdi.', ephemeral: true });
    return;
  }

  if (giveaway.ended) {
    await interaction.reply({ content: 'Bu çekiliş zaten tamamlandı.', ephemeral: true });
    return;
  }

  if (giveaway.endsAt && giveaway.endsAt <= Date.now()) {
    await finalizeGiveaway(interaction.client, giveaway, {
      reason: 'Süre dolduğu için katılım sırasında sonuçlandırıldı.'
    });
    await interaction.reply({ content: 'Çekiliş süresi dolduğu için sonuçlandırıldı.', ephemeral: true });
    return;
  }

  const participants = new Set(giveaway.participants ?? []);
  const alreadyJoined = participants.has(interaction.user.id);

  if (alreadyJoined) {
    await removeParticipant(interaction.guildId, giveawayId, interaction.user.id);
    await interaction.reply({ content: 'Katılımın iptal edildi.', ephemeral: true });
  } else {
    await addParticipant(interaction.guildId, giveawayId, interaction.user.id);
    await interaction.reply({ content: 'Çekilişe başarıyla katıldın. Bol şans!', ephemeral: true });
  }
}

export async function createGiveawayMessage(interaction, options) {
  const channel = options.channel ?? interaction.channel;
  if (!channel?.isTextBased()) {
    await interaction.editReply({ content: 'Metin tabanlı bir kanal seçmelisin.' });
    return null;
  }

  const endsAt = Date.now() + options.durationMs;
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`🎁 Çekiliş: ${options.prize}`)
    .setDescription('Katılmak için aşağıdaki düğmeye basmalısın. Katılım her kullanıcı için bir kere sayılır.')
    .addFields(
      { name: 'Kazanan Sayısı', value: `${options.winnerCount}`, inline: true },
      { name: 'Bitiş', value: time(Math.floor(endsAt / 1000), 'R'), inline: true },
      { name: 'Başlatan', value: `<@${interaction.user.id}>`, inline: false }
    )
    .setFooter({ text: 'Furmin çekiliş sistemi' })
    .setTimestamp();

  const message = await channel
    .send({ embeds: [embed], components: options.components })
    .catch((error) => {
      console.error('Çekiliş mesajı oluşturulamadı:', error);
      return null;
    });

  if (!message) {
    await interaction.editReply({ content: 'Çekiliş mesajı oluşturulamadı. Kanal izinlerini kontrol edin.' });
    return null;
  }

  const giveaway = await createGiveaway({
    id: options.giveawayId,
    guildId: interaction.guildId,
    channelId: channel.id,
    messageId: message.id,
    createdBy: interaction.user.id,
    prize: options.prize,
    winners: options.winnerCount,
    endsAt,
    participants: [],
    ended: false
  });

  if (giveaway) {
    const relativeTime = `<t:${Math.floor(giveaway.endsAt / 1000)}:R>`;

    await sendModerationLog(interaction.client, giveaway.guildId, {
      action: 'Çekiliş Başlatıldı',
      description: `🎁 **${giveaway.prize}** ödüllü çekiliş ${channel} kanalında başlatıldı.`,
      color: 0xf1c40f,
      moderatorUser: interaction.user,
      extraFields: [
        { name: 'Bitiş', value: relativeTime, inline: true },
        { name: 'Kazanan Sayısı', value: `${giveaway.winners}`, inline: true }
      ]
    });

    await sendDetailedLog(interaction.client, giveaway.guildId, 'general', {
      title: '🎁 Yeni Çekiliş',
      description: `${channel} kanalında **${giveaway.prize}** ödüllü çekiliş başlatıldı.`,
      fields: [
        { name: 'Bitiş', value: relativeTime, inline: true },
        { name: 'Kazanan Sayısı', value: `${giveaway.winners}`, inline: true },
        { name: 'Başlatan', value: `<@${interaction.user.id}>`, inline: true }
      ]
    });
  }

  return giveaway;
}

export async function rerollGiveaway(client, guildId, giveawayId) {
  const giveaway = await getGiveaway(guildId, giveawayId);
  if (!giveaway) {
    return { giveaway: null, winners: [] };
  }

  const winners = pickWinners(giveaway.participants, giveaway.winners ?? 1);
  await endGiveaway(guildId, giveawayId, winners);
  await finalizeGiveaway(client, { ...giveaway, winners, ended: false }, {
    reason: 'Çekiliş yeniden kazanan belirlemek için güncellendi.'
  });
  return { giveaway, winners };
}

export async function stopGiveaway(client, guildId, giveawayId) {
  const giveaway = await getGiveaway(guildId, giveawayId);
  if (!giveaway) {
    return null;
  }

  await finalizeGiveaway(client, giveaway, { reason: 'Çekiliş yetkili tarafından elle sonlandırıldı.' });
  return giveaway;
}
