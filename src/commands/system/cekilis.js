import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
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
  category: 'Sistem',
  menuGroup: 'Yönetim Araçları',
  data: new SlashCommandBuilder()
    .setName('cekilis')
    .setDescription('Sunucu için çekilişleri yönetir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('baslat')
        .setDescription('Yeni bir çekiliş başlatır.')
        .addStringOption((option) =>
          option.setName('odul').setDescription('Kazananlara verilecek ödül').setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName('sure')
            .setDescription('Çekiliş süresi (dakika cinsinden, minimum 5)')
            .setMinValue(5)
            .setMaxValue(14_400)
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName('kazanan')
            .setDescription('Kazanan sayısı')
            .setMinValue(1)
            .setMaxValue(10)
        )
        .addChannelOption((option) =>
          option
            .setName('kanal')
            .setDescription('Çekiliş duyurusunun paylaşılacağı kanal')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('bitir')
        .setDescription('Devam eden bir çekilişi hemen bitirir.')
        .addStringOption((option) =>
          option
            .setName('mesaj')
            .setDescription('Çekiliş mesajının bağlantısı veya ID değeri')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('yenile')
        .setDescription('Tamamlanan çekiliş için yeni kazanan seçer.')
        .addStringOption((option) =>
          option
            .setName('mesaj')
            .setDescription('Çekiliş mesajının bağlantısı veya ID değeri')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) => sub.setName('liste').setDescription('Aktif çekilişleri listeler.')),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', flags: MessageFlags.Ephemeral });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'baslat') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const prize = interaction.options.getString('odul', true);
      const minutes = interaction.options.getInteger('sure', true);
      const winners = interaction.options.getInteger('kazanan') ?? 1;
      const targetChannel = interaction.options.getChannel('kanal');

      const giveawayId = crypto.randomUUID();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`giveaway-join:${giveawayId}`)
          .setLabel('Katıl')
          .setEmoji('🎟️')
          .setStyle(ButtonStyle.Success)
      );

      const giveaway = await createGiveawayMessage(interaction, {
        prize,
        winnerCount: winners,
        durationMs: minutes * 60_000,
        channel: targetChannel,
        components: [row],
        giveawayId
      });

      if (!giveaway) {
        return;
      }

      await interaction.editReply({
        content: `🎉 Çekiliş oluşturuldu! Kanal: <#${giveaway.channelId}> • Bitiş: <t:${Math.floor(
          giveaway.endsAt / 1000
        )}:R>`
      });
      return;
    }

    if (sub === 'liste') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const giveaways = await listActiveGiveaways(interaction.guildId);

      if (!giveaways.length) {
        await interaction.editReply({ content: '🔎 Aktif çekiliş bulunmuyor.' });
        return;
      }

      const lines = giveaways
        .map((item) => {
          const ends = `<t:${Math.floor(item.endsAt / 1000)}:R>`;
          return `• **${item.prize}** — Kanal: <#${item.channelId}> • Bitiş: ${ends}`;
        })
        .join('\n');

      await interaction.editReply({ content: lines });
      return;
    }

    const messageId = parseMessageId(interaction.options.getString('mesaj', true));
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const giveaway = await findGiveawayByMessage(interaction.guildId, messageId);

    if (!giveaway) {
      await interaction.editReply({ content: '❌ Belirtilen mesaj için kayıtlı çekiliş bulunamadı.' });
      return;
    }

    if (sub === 'bitir') {
      await stopGiveaway(interaction.client, interaction.guildId, giveaway.id);
      await interaction.editReply({ content: '✅ Çekiliş sonuçlandırıldı ve kazananlar duyuruldu.' });
      return;
    }

    if (sub === 'yenile') {
      const result = await rerollGiveaway(interaction.client, interaction.guildId, giveaway.id);
      const winners = result.winners.length
        ? result.winners.map((id) => `<@${id}>`).join(', ')
        : 'Yeni kazanan seçilemedi.';
      await interaction.editReply({ content: `🔁 Yeni kazananlar: ${winners}` });
    }
  }
};
