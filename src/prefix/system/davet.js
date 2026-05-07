import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import {
  addInviteRewardTier,
  getInviteSettings,
  removeInviteRewardTier,
  setInviteLogChannel
} from '../../utils/inviteStorage.js';

const usage =
  'Kullanım: `davet kanal #kanal`, `davet odul @Rol 5`, `davet odul-kaldir @Rol` veya `davet liste`. Kanalı etiketleyebilir, rolü etiketleyebilir ya da ID yazabilirsin.';

function resolveChannel(message, raw) {
  if (!raw) {
    return message.mentions.channels.first() ?? null;
  }

  const mention = message.mentions.channels.first();
  if (mention) return mention;

  const cleaned = raw.replace(/[<#>]/g, '').trim();
  if (!cleaned) return null;

  return message.guild.channels.cache.get(cleaned) ?? null;
}

function resolveRole(message, raw) {
  if (!raw) {
    return message.mentions.roles.first() ?? null;
  }

  const mention = message.mentions.roles.first();
  if (mention) return mention;

  const cleaned = raw.replace(/[<@&>]/g, '').trim();
  if (!cleaned) return null;

  return message.guild.roles.cache.get(cleaned) ?? null;
}

async function buildSummaryEmbed(message) {
  const settings = await getInviteSettings(message.guild.id);
  const logChannelLabel = settings.logChannelId
    ? message.guild.channels.cache.get(settings.logChannelId)?.toString() ?? `#${settings.logChannelId}`
    : 'Ayarlanmamış';

  const rewardLines = settings.rewards.length
    ? settings.rewards
        .slice()
        .sort((a, b) => a.amount - b.amount)
        .map((reward) => {
          const role = message.guild.roles.cache.get(reward.roleId);
          const roleLabel = role ? role.toString() : `\`${reward.roleId}\``;
          return `• ${reward.amount} davet → ${roleLabel}`;
        })
        .join('\n')
    : 'Tanımlı ödül bulunmuyor.';

  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('Davet Sistemi Özeti')
    .setDescription('Log kanalını ve davet ödüllerini buradan yönetebilirsin.')
    .addFields(
      { name: 'Log Kanalı', value: logChannelLabel, inline: true },
      { name: 'Ödül Basamakları', value: rewardLines, inline: false }
    )
    .setFooter({ text: 'Furmin davet yönetimi' })
    .setTimestamp();
}

export default {
  name: 'davet',
  aliases: ['invite', 'davetler'],
  catalogKey: 'davet',
  category: 'Sistem',
  menuGroup: 'Sistemler',
  description: 'Davet log kanalını ve ödül basamaklarını yönetir.',
  async execute(message, args) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply({
        content: '⛔ Davet ayarlarını yönetmek için **Sunucuyu Yönet** yetkisine sahip olmalısın.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const action = (args.shift() ?? '').toLowerCase();

    if (!action || ['yardim', 'help'].includes(action)) {
      await message.reply({ content: usage, allowedMentions: { repliedUser: false } });
      return;
    }

    if (action === 'kanal' || action === 'channel') {
      const channel = resolveChannel(message, args.shift());
      if (!channel || !channel.isTextBased() || channel.isDMBased()) {
        await message.reply({
          content: `⚠️ Geçerli bir metin kanalı belirtmelisin. ${usage}`,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const me = message.guild.members.me;
      const requiredPerms = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks
      ];

      if (!me?.permissionsIn(channel).has(requiredPerms)) {
        await message.reply({
          content: '⚠️ Bu kanala erişim iznim yok. Görüntüleme, mesaj gönderme ve bağlantıları yerleştirme yetkilerim olmalı.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      await setInviteLogChannel(message.guild.id, channel.id);
      const embed = await buildSummaryEmbed(message);
      await message.reply({
        content: `📨 Davet log kanalı ${channel} olarak kaydedildi.`,
        embeds: [embed],
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (action === 'odul' || action === 'ödül' || action === 'odul-ekle' || action === 'ödül-ekle') {
      const role = resolveRole(message, args.shift());
      const amountRaw = args.shift();
      const amount = amountRaw ? Number.parseInt(amountRaw, 10) : NaN;

      if (!role || !Number.isFinite(amount) || amount <= 0) {
        await message.reply({
          content: `⚠️ Rolü ve davet sayısını doğru girmelisin. ${usage}`,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      await addInviteRewardTier(message.guild.id, amount, role.id);
      const embed = await buildSummaryEmbed(message);
      const me = message.guild.members.me;
      const warning = me?.permissions.has(PermissionFlagsBits.ManageRoles)
        ? ''
        : '\n⚠️ Furmin\'in ödül verebilmesi için Rolleri Yönet yetkisine ihtiyacı var.';

      await message.reply({
        content: `✅ ${role} rolü ${amount} davet için ödül olarak tanımlandı.${warning}`,
        embeds: [embed],
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (
      action === 'odul-kaldir' ||
      action === 'ödül-kaldır' ||
      action === 'odulkaldir' ||
      action === 'ödülkaldır'
    ) {
      const role = resolveRole(message, args.shift());
      if (!role) {
        await message.reply({
          content: `⚠️ Kaldırılacak rolü belirtmelisin. ${usage}`,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      await removeInviteRewardTier(message.guild.id, role.id);
      const embed = await buildSummaryEmbed(message);
      await message.reply({
        content: `🗑️ ${role} rolü davet ödüllerinden kaldırıldı.`,
        embeds: [embed],
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (action === 'liste' || action === 'list') {
      const embed = await buildSummaryEmbed(message);
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    await message.reply({ content: `❓ Bilinmeyen işlem. ${usage}`, allowedMentions: { repliedUser: false } });
  }
};
