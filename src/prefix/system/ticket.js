import { ChannelType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import {
  buildTicketPanelComponents,
  buildTicketPanelEmbed,
  createTicketChannel,
  recordTicketPanel
} from '../../utils/ticketManager.js';
import {
  describeTicketConfig,
  getTicketConfig,
  setTicketTopics,
  updateTicketConfig
} from '../../utils/ticketStorage.js';

const usage =
  'Kullanım: `ticket panel #panelkanalı #ticketkategori #logkanalı [#arsivkanalı] Konu1;Konu2`, `ticket log #kanal`, `ticket arsiv #kanal`, `ticket destek @Rol`, `ticket konular Destek;Şikayet`, `ticket bilgi`.';

function resolveChannelArg(message, raw) {
  if (!raw) return null;
  const match = raw.match(/<#(\d+)>/);
  const id = match ? match[1] : raw;
  return message.guild.channels.cache.get(id);
}

function resolveRoleArg(message, raw) {
  if (!raw) return message.mentions.roles.first() ?? null;
  const match = raw.match(/<@&?(\d+)>/);
  const id = match ? match[1] : raw;
  return message.guild.roles.cache.get(id);
}

export default {
  name: 'ticket',
  aliases: ['destek'],
  catalogKey: 'ticket',
  category: 'Sistem',
  menuGroup: 'Sistemler',
  description: 'Ticket panelini, log / transkript kanallarını ve destek rolünü yönetir.',
  async execute(message, args) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply({
        content: '⛔ Ticket sistemini yönetmek için **Sunucuyu Yönet** yetkisine sahip olmalısın.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const action = (args.shift() ?? '').toLowerCase();
    if (!action) {
      await message.reply({ content: usage, allowedMentions: { repliedUser: false } });
      return;
    }

    if (['bilgi', 'durum', 'liste'].includes(action)) {
      const summary = await describeTicketConfig(message.guild.id, message.guild);
      const embed = new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle('🎟️ Ticket Ayarları')
        .setDescription(summary)
        .setTimestamp();
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    if (action === 'panel') {
      const panelChannel = resolveChannelArg(message, args.shift());
      const categoryChannel = resolveChannelArg(message, args.shift());
      const logChannel = resolveChannelArg(message, args.shift());
      const transcriptChannelCandidate = resolveChannelArg(message, args[0] ?? null);
      const useTranscript = transcriptChannelCandidate && transcriptChannelCandidate.isTextBased();
      if (useTranscript) {
        args.shift();
      }
      const topicsRaw = args.join(' ');
      if (!panelChannel || !panelChannel.isTextBased()) {
        await message.reply({ content: '⚠️ Paneli göndereceğim metin kanalını belirtmelisin.', allowedMentions: { repliedUser: false } });
        return;
      }
      if (!categoryChannel || categoryChannel.type !== ChannelType.GuildCategory) {
        await message.reply({ content: '⚠️ Ticket kanallarının açılacağı kategori belirtilmelidir.', allowedMentions: { repliedUser: false } });
        return;
      }
      if (!logChannel || !logChannel.isTextBased()) {
        await message.reply({ content: '⚠️ Ticket kayıtlarının tutulacağı metin kanalını belirtmelisin.', allowedMentions: { repliedUser: false } });
        return;
      }

      const topics = topicsRaw
        ? topicsRaw.split(';').map((entry) => entry.trim()).filter(Boolean)
        : [];
      if (topics.length) {
        await setTicketTopics(message.guild.id, topics.map((label) => ({ label }))); // id otomatik üretilecek
      }

      const existingConfig = await getTicketConfig(message.guild.id);
      const updates = {
        panelChannelId: panelChannel.id,
        categoryId: categoryChannel.id,
        logChannelId: logChannel.id
      };
      if (useTranscript) {
        updates.transcriptChannelId = transcriptChannelCandidate.id;
      } else if (!existingConfig?.transcriptChannelId) {
        updates.transcriptChannelId = null;
      }

      await updateTicketConfig(message.guild.id, updates);

      const config = await getTicketConfig(message.guild.id);
      const embed = buildTicketPanelEmbed(config, message.guild);
      const components = buildTicketPanelComponents(message.guild.id, config);
      const sent = await panelChannel.send({ embeds: [embed], components });
      await recordTicketPanel(message.guild.id, { channelId: panelChannel.id, messageId: sent.id });

      const existingTranscriptChannel = existingConfig?.transcriptChannelId
        ? message.guild.channels.cache.get(existingConfig.transcriptChannelId)
        : null;
      const transcriptSuffix = useTranscript
        ? ` Log: ${logChannel}, Arşiv: ${transcriptChannelCandidate}.`
        : existingConfig?.transcriptChannelId
          ? ` Log: ${logChannel}, Arşiv: ${existingTranscriptChannel ?? `<#${existingConfig.transcriptChannelId}>`}.`
          : ` Log: ${logChannel}.`;
      const confirmation = `✅ Ticket paneli ${panelChannel} kanalında yayınlandı.${transcriptSuffix}`;
      await message.reply({
        content: confirmation,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (['log', 'logkanal', 'log-kanal'].includes(action)) {
      const channel = resolveChannelArg(message, args.shift());
      if (!channel || !channel.isTextBased()) {
        await message.reply({ content: '⚠️ Ticket loglarının gönderileceği metin kanalını etiketlemelisin.', allowedMentions: { repliedUser: false } });
        return;
      }
      await updateTicketConfig(message.guild.id, { logChannelId: channel.id });
      await message.reply({
        content: `✅ Ticket log kanalı ${channel} olarak ayarlandı.`,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (['arsiv', 'arşiv', 'transkript', 'transcript'].includes(action)) {
      const channel = resolveChannelArg(message, args.shift());
      if (channel && !channel.isTextBased()) {
        await message.reply({ content: '⚠️ Arşiv için geçerli bir metin kanalı seçmelisin.', allowedMentions: { repliedUser: false } });
        return;
      }
      await updateTicketConfig(message.guild.id, { transcriptChannelId: channel ? channel.id : null });
      await message.reply({
        content: channel
          ? `✅ Ticket transkriptleri ${channel} kanalına gönderilecek.`
          : 'ℹ️ Ticket transkript kanalı temizlendi. Log kanalı kullanılacak.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (['destek', 'rol'].includes(action)) {
      const role = resolveRoleArg(message, args.shift());
      if (!role) {
        await message.reply({ content: '⚠️ Destek rolünü etiketlemelisin.', allowedMentions: { repliedUser: false } });
        return;
      }
      await updateTicketConfig(message.guild.id, { supportRoleId: role.id });
      await message.reply({
        content: `✅ Ticket destek rolü ${role} olarak ayarlandı.`,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (action === 'konular') {
      const topics = args.join(' ')
        .split(';')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((label) => ({ label }));
      if (!topics.length) {
        await message.reply({ content: '⚠️ En az bir konu başlığı yazmalısın.', allowedMentions: { repliedUser: false } });
        return;
      }
      await setTicketTopics(message.guild.id, topics);
      await message.reply({
        content: `✅ Ticket konuları güncellendi: ${topics.map((t) => t.label).join(', ')}.`,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (action === 'ac' || action === 'aç') {
      const topicId = args.shift() ?? null;
      const fakeInteraction = {
        guild: message.guild,
        guildId: message.guild.id,
        member: message.member,
        user: message.author,
        client: message.client
      };
      const result = await createTicketChannel(fakeInteraction, topicId);
      if (result.error) {
        await message.reply({ content: `⚠️ ${result.error}`, allowedMentions: { repliedUser: false } });
        return;
      }
      await message.reply({
        content: `✅ Ticket kanalın ${result.channel} olarak açıldı.`,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    await message.reply({ content: usage, allowedMentions: { repliedUser: false } });
  }
};
