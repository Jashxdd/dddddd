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

async function finalizeGiveaway(client, giveaway) {
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
    await finalizeGiveaway(interaction.client, giveaway);
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

  return giveaway;
}

export async function rerollGiveaway(client, guildId, giveawayId) {
  const giveaway = await getGiveaway(guildId, giveawayId);
  if (!giveaway) {
    return { giveaway: null, winners: [] };
  }

  const winners = pickWinners(giveaway.participants, giveaway.winners ?? 1);
  await endGiveaway(guildId, giveawayId, winners);
  await finalizeGiveaway(client, { ...giveaway, winners, ended: false });
  return { giveaway, winners };
}

export async function stopGiveaway(client, guildId, giveawayId) {
  const giveaway = await getGiveaway(guildId, giveawayId);
  if (!giveaway) {
    return null;
  }

  await finalizeGiveaway(client, giveaway);
  return giveaway;
}
