import { EmbedBuilder, userMention } from 'discord.js';
import { sendDetailedLog } from './detailedLog.js';

function formatCurrency(amount) {
  const numeric = Number.isFinite(amount) ? Number(amount) : 0;
  const prefix = numeric >= 0 ? '+' : '-';
  const absolute = Math.abs(Math.floor(numeric));
  return `${prefix}${absolute.toLocaleString('tr-TR')} 💰`;
}

function formatBalance(amount) {
  const numeric = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  return `${numeric.toLocaleString('tr-TR')} 💰`;
}

export async function logEconomyChange(client, guildId, details) {
  if (!client || !guildId || !details?.userId) {
    return false;
  }

  const amount = Number.isFinite(details.amount) ? Number(details.amount) : 0;
  const balanceAfter = Number.isFinite(details.balanceAfter) ? Number(details.balanceAfter) : null;
  const embed = new EmbedBuilder()
    .setColor(amount >= 0 ? 0x2ecc71 : 0xe74c3c)
    .setTitle(details.title ?? 'Ekonomi İşlemi Kaydedildi')
    .setTimestamp();

  const actorMention = details.executorId && details.executorId !== details.userId
    ? userMention(details.executorId)
    : null;

  const descriptionParts = [`${userMention(details.userId)} için işlem işlendi.`];
  if (actorMention) {
    descriptionParts.push(`İşlemi başlatan: ${actorMention}.`);
  }
  if (details.description) {
    descriptionParts.push(details.description);
  }
  embed.setDescription(descriptionParts.join(' '));

  const fields = [];
  if (details.type) {
    fields.push({ name: 'İşlem Türü', value: details.type, inline: true });
  }
  fields.push({ name: 'Tutar', value: formatCurrency(amount), inline: true });
  if (balanceAfter !== null) {
    fields.push({ name: 'Yeni Bakiye', value: formatBalance(balanceAfter), inline: true });
  }
  if (details.note) {
    fields.push({ name: 'Not', value: details.note, inline: false });
  }

  if (fields.length) {
    embed.addFields(fields);
  }

  return sendDetailedLog(client, guildId, 'economy', {
    title: embed.data.title,
    description: embed.data.description,
    fields: embed.data.fields,
    color: embed.data.color,
    footer: embed.data.footer,
    thumbnail: embed.data.thumbnail
  });
}
