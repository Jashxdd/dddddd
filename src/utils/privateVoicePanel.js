import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export function buildPrivateVoiceEmbed({ channel, owner, locked, limit, createdAt }) {
  const embed = new EmbedBuilder()
    .setColor(0x1abc9c)
    .setTitle('🎧 Özel Ses Kontrol Paneli')
    .setDescription(
      channel
        ? `${channel} için kontroller aşağıdadır. Butonlarla odayı yönetebilirsin.`
        : 'Ses odası bulunamadı. Panel otomatik olarak kapanacak.'
    )
    .setFooter({ text: 'Furmin • Dinamik Ses Sistemi' })
    .setTimestamp();

  if (owner) {
    embed.addFields({ name: 'Oda Sahibi', value: owner, inline: true });
  }

  if (typeof locked === 'boolean') {
    embed.addFields({ name: 'Durum', value: locked ? '🔒 Kilitli' : '🔓 Açık', inline: true });
  }

  if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
    embed.addFields({ name: 'Üye Limiti', value: `${limit}`, inline: true });
  } else {
    embed.addFields({ name: 'Üye Limiti', value: 'Sınırsız', inline: true });
  }

  if (createdAt) {
    embed.addFields({ name: 'Oluşturma', value: `<t:${Math.floor(createdAt / 1000)}:R>`, inline: true });
  }

  return embed;
}

export function buildPrivateVoiceButtons(guildId, channelId, { locked }) {
  const toggleLabel = locked ? 'Kilidi Aç' : 'Kilitle';
  const toggleEmoji = locked ? '🔓' : '🔒';

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`pvoice:toggle:${guildId}:${channelId}`)
      .setLabel(toggleLabel)
      .setEmoji(toggleEmoji)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`pvoice:limitup:${guildId}:${channelId}`)
      .setLabel('Limit +1')
      .setEmoji('➕')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`pvoice:limitdown:${guildId}:${channelId}`)
      .setLabel('Limit -1')
      .setEmoji('➖')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`pvoice:refresh:${guildId}:${channelId}`)
      .setLabel('Yenile')
      .setEmoji('♻️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`pvoice:delete:${guildId}:${channelId}`)
      .setLabel('Odayı Kapat')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger)
  );

  return [row];
}
