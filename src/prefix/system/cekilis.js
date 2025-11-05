import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import crypto from 'node:crypto';
import {
  createGiveawayMessage,
  listActiveGiveaways,
  rerollGiveaway,
  stopGiveaway
} from '../../utils/giveawayManager.js';
import { findGiveawayByMessage } from '../../utils/giveawayStorage.js';

function parseMessageId(value) {
  if (!value) return '';
  const match = value.match(/(\d{10,})$/);
  return match ? match[1] : value.trim();
}

export default {
  name: 'cekilis',
  aliases: ['cekiliş', 'giveaway'],
  category: 'Sistem',
  menuGroup: 'Yönetim Araçları',
  description: 'Çekiliş oluşturur, listeler ve yönetir.',
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  async execute(message, args) {
    if (!args.length) {
      await message.reply({
        content:
          'Kullanım: `cekilis baslat <dakika> <kazanan> <ödül>` | `cekilis liste` | `cekilis bitir <mesajId>` | `cekilis yenile <mesajId>`',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const sub = args.shift().toLowerCase();

    if (sub === 'liste') {
      const active = await listActiveGiveaways(message.guildId);
      if (!active.length) {
        await message.reply({ content: '🔎 Aktif çekiliş bulunmuyor.', allowedMentions: { repliedUser: false } });
        return;
      }

      const lines = active
        .map((item) => `• **${item.prize}** • Kanal: <#${item.channelId}> • Bitiş: <t:${Math.floor(item.endsAt / 1000)}:R>`)
        .join('\n');

      await message.reply({ content: lines, allowedMentions: { repliedUser: false } });
      return;
    }

    if (sub === 'baslat') {
      if (args.length < 3) {
        await message.reply({
          content: 'Eksik parametre. Örnek: `cekilis baslat 60 2 Nitro Classic`',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const minutes = Number.parseInt(args.shift(), 10);
      const winners = Number.parseInt(args.shift(), 10);
      const prize = args.join(' ').trim();

      if (!Number.isFinite(minutes) || minutes < 5) {
        await message.reply({
          content: 'Süre dakika cinsinden olmalı ve en az 5 olmalıdır.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      if (!Number.isFinite(winners) || winners < 1 || winners > 10) {
        await message.reply({
          content: 'Kazanan sayısı 1 ile 10 arasında olmalıdır.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      if (!prize) {
        await message.reply({ content: 'Ödül bilgisini yazmalısın.', allowedMentions: { repliedUser: false } });
        return;
      }

      const giveawayId = crypto.randomUUID();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`giveaway-join:${giveawayId}`)
          .setLabel('Katıl')
          .setEmoji('🎟️')
          .setStyle(ButtonStyle.Success)
      );

      const fakeInteraction = {
        guildId: message.guildId,
        channel: message.channel,
        user: message.author,
        client: message.client,
        async editReply(payload) {
          await message.reply({ ...payload, allowedMentions: { repliedUser: false } });
        }
      };

      const giveaway = await createGiveawayMessage(fakeInteraction, {
        prize,
        winnerCount: winners,
        durationMs: minutes * 60_000,
        channel: message.channel,
        components: [row],
        giveawayId
      });

      if (!giveaway) {
        await message.reply({
          content: 'Çekiliş oluşturulamadı. Kanal izinlerini kontrol edin.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      await message.reply({
        content: `🎉 Çekiliş başladı! <#${giveaway.channelId}> kanalında ${Math.floor(minutes)} dakikalık süre aktif.`,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (sub === 'bitir' || sub === 'yenile') {
      if (!args.length) {
        await message.reply({
          content: 'Lütfen mesaj bağlantısı veya ID değeri girin.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const messageId = parseMessageId(args[0]);
      const giveaway = await findGiveawayByMessage(message.guildId, messageId);
      if (!giveaway) {
        await message.reply({ content: 'Belirtilen çekiliş bulunamadı.', allowedMentions: { repliedUser: false } });
        return;
      }

      if (sub === 'bitir') {
        await stopGiveaway(message.client, message.guildId, giveaway.id);
        await message.reply({ content: '✅ Çekiliş sonuçlandırıldı.', allowedMentions: { repliedUser: false } });
        return;
      }

      const result = await rerollGiveaway(message.client, message.guildId, giveaway.id);
      const winners = result.winners.length
        ? result.winners.map((id) => `<@${id}>`).join(', ')
        : 'Yeni kazanan seçilemedi.';
      await message.reply({ content: `🔁 Yeni kazananlar: ${winners}`, allowedMentions: { repliedUser: false } });
      return;
    }

    await message.reply({
      content:
        'Bilinmeyen alt komut. Kullanım: `cekilis baslat`, `cekilis liste`, `cekilis bitir`, `cekilis yenile`',
      allowedMentions: { repliedUser: false }
    });
  }
};
