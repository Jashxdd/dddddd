import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import {
  addBannedWord,
  getBannedWords,
  getAdvertisementBanThreshold,
  isAutomodEnabled,
  isInviteBlockEnabled,
  removeBannedWord,
  setAutomodEnabled,
  setAdvertisementBanThreshold,
  setInviteBlockEnabled
} from '../../utils/automodConfig.js';
import { formatUserMention, sendModerationLog } from '../../utils/modLog.js';
import { sendBotLog } from '../../utils/botLog.js';

export default {
  category: 'Moderasyon',
  data: new SlashCommandBuilder()
    .setName('otomod')
    .setDescription('Otomatik moderasyon ayarlarini yonetir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('durum')
        .setDescription('Otomatik moderasyonu acar veya kapatir.')
        .addStringOption((option) =>
          option
            .setName('secim')
            .setDescription('Automod durumunu belirle')
            .setRequired(true)
            .addChoices(
              { name: 'Ac', value: 'ac' },
              { name: 'Kapat', value: 'kapat' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('kelime-ekle')
        .setDescription('Yasakli kelime listesine yeni bir kelime ekler.')
        .addStringOption((option) =>
          option
            .setName('kelime')
            .setDescription('Yasaklanacak kelime veya ifade')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('kelime-kaldir')
        .setDescription('Yasakli kelime listesinden bir kelimeyi kaldirir.')
        .addStringOption((option) =>
          option
            .setName('kelime')
            .setDescription('Silinecek kelime veya ifade')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reklam-engel')
        .setDescription('Discord davetlerini ve reklam bağlantılarını engellemeyi açar/kapatır.')
        .addStringOption((option) =>
          option
            .setName('secim')
            .setDescription('Reklam engelini aç veya kapat')
            .setRequired(true)
            .addChoices(
              { name: 'Aç', value: 'ac' },
              { name: 'Kapat', value: 'kapat' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reklam-cezasi')
        .setDescription('Reklam yakalandığında uygulanacak yaptırımı belirler.')
        .addStringOption((option) =>
          option
            .setName('secim')
            .setDescription('Reklam engeli sonrasında uygulanacak ceza')
            .setRequired(true)
            .addChoices(
              { name: 'Sadece uyar', value: 'uyari' },
              { name: '3 kez reklam yapanı yasakla', value: 'ban-3' }
            )
        )
    )
    .addSubcommand((sub) => sub.setName('liste').setDescription('Aktif yasakli kelime listesini gösterir.')),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'Automod ayarlari yalnizca bir sunucuda degistirilebilir.',
        ephemeral: true
      });
      return;
    }

    const { guildId } = interaction;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'durum') {
      const choice = interaction.options.getString('secim');
      const enabled = choice === 'ac';
      await setAutomodEnabled(guildId, enabled);

      const message = enabled
        ? '✅ Otomatik moderasyon etkinlestirildi. Yasakli kelimeler tespit edildiginde mesajlar otomatik silinecek.'
        : '⏹️ Otomatik moderasyon devre disi birakildi.';

      await interaction.reply({ content: message, ephemeral: true });

      await sendModerationLog(interaction.client, interaction.guildId, {
        action: 'Yerel Automod',
        moderator: formatUserMention(interaction.user),
        reason: enabled
          ? 'Yerel otomatik moderasyon sistemi etkinlestirildi.'
          : 'Yerel otomatik moderasyon sistemi devre disi birakildi.',
        color: enabled ? 0x27ae60 : 0xe67e22,
        extraFields: [{ name: 'Durum', value: enabled ? 'Acik' : 'Kapali', inline: true }]
      });
      return;
    }

    if (subcommand === 'kelime-ekle') {
      const word = interaction.options.getString('kelime');
      const result = await addBannedWord(guildId, word);

      if (result.added) {
        const automodActive = await isAutomodEnabled(guildId);
        const replyMessage = automodActive
          ? '✅ Kelime listeye eklendi ve otomatik olarak izleniyor.'
          : '✅ Kelime listeye eklendi. Not: Automod su anda kapali, `/otomod durum secim:ac` komutu ile etkinlestirebilirsin.';

        await interaction.reply({ content: replyMessage, ephemeral: true });

        await sendModerationLog(interaction.client, interaction.guildId, {
          action: 'Yerel Automod',
          moderator: formatUserMention(interaction.user),
          reason: `Yasakli kelime eklendi: **${word.toLowerCase()}**`,
          color: 0xe74c3c,
          extraFields: [{ name: 'Durum', value: automodActive ? 'Acik' : 'Kapali', inline: true }]
        });
        return;
      }

      let errorMessage = '⚠️ Kelime eklenemedi.';
      if (result.reason === 'kelime_cok_kisa') {
        errorMessage = '⚠️ Kelime cok kisa. Lutfen en az 2 karakterlik bir ifade gir.';
      } else if (result.reason === 'zaten_var') {
        errorMessage = '⚠️ Bu kelime zaten yasakli listesinde bulunuyor.';
      }

      await interaction.reply({ content: errorMessage, ephemeral: true });
      return;
    }

    if (subcommand === 'kelime-kaldir') {
      const word = interaction.options.getString('kelime');
      const removed = await removeBannedWord(guildId, word);

      await interaction.reply({
        content: removed
          ? '🗑️ Kelime listeden kaldirildi.'
          : '⚠️ Belirtilen kelime yasakli listesinde bulunmuyor.',
        ephemeral: true
      });

      if (removed) {
        await sendModerationLog(interaction.client, interaction.guildId, {
          action: 'Yerel Automod',
          moderator: formatUserMention(interaction.user),
          reason: `Yasakli kelime kaldirildi: **${word.toLowerCase()}**`,
          color: 0x3498db
        });
      }
      return;
    }

    if (subcommand === 'reklam-engel') {
      const choice = interaction.options.getString('secim');
      const enabled = choice === 'ac';
      await setInviteBlockEnabled(guildId, enabled);

      await interaction.reply({
        content: enabled
          ? '🚫 Reklam engeli aktif. Davet bağlantıları otomatik olarak silinecek.'
          : 'ℹ️ Reklam engeli kapatıldı.',
        ephemeral: true
      });

      await sendModerationLog(interaction.client, interaction.guildId, {
        action: 'Yerel Automod',
        moderator: formatUserMention(interaction.user),
        reason: enabled
          ? 'Reklam engeli açıldı. Davet ve tanıtım bağlantıları engellenecek.'
          : 'Reklam engeli devre dışı bırakıldı.',
        color: enabled ? 0xe74c3c : 0xe67e22,
        extraFields: [{ name: 'Durum', value: enabled ? 'Açık' : 'Kapalı', inline: true }]
      });
      return;
    }

    if (subcommand === 'reklam-cezasi') {
      const choice = interaction.options.getString('secim');
      const threshold = choice === 'ban-3' ? 3 : null;
      await setAdvertisementBanThreshold(guildId, threshold);

      const reply = threshold
        ? '🚨 Reklam paylaşan üyeler 3 ihlalde otomatik olarak yasaklanacak.'
        : 'ℹ️ Reklam engeli artık yalnızca uyarı verecek. Otomatik yasak devre dışı.';

      await interaction.reply({ content: reply, ephemeral: true });

      const logFields = [
        { name: 'Yeni Ceza', value: threshold ? '3 reklam -> Ban' : 'Sadece uyarı', inline: true }
      ];

      await sendModerationLog(interaction.client, interaction.guildId, {
        action: 'Yerel Automod',
        moderator: formatUserMention(interaction.user),
        reason: threshold
          ? 'Reklam ihlallerinde otomatik yasaklama etkinleştirildi.'
          : 'Reklam ihlallerinde otomatik yasaklama kapatıldı.',
        color: threshold ? 0xc0392b : 0xf1c40f,
        extraFields: logFields
      });

      const embed = new EmbedBuilder()
        .setColor(threshold ? 0xc0392b : 0xf1c40f)
        .setTitle('Reklam Cezası Güncellendi')
        .setDescription('Automod reklam ihlali cezası güncellendi.')
        .addFields(
          { name: 'Sunucu', value: interaction.guild?.name ?? 'Bilinmiyor', inline: true },
          { name: 'Sunucu ID', value: interaction.guildId ?? 'Bilinmiyor', inline: true },
          { name: 'Yeni Ceza', value: threshold ? '3 reklam -> Ban' : 'Sadece uyarı', inline: true },
          { name: 'Yetkili', value: formatUserMention(interaction.user), inline: true }
        )
        .setTimestamp();

      await sendBotLog(interaction.client, { embeds: [embed] });
      return;
    }

    if (subcommand === 'liste') {
      const bannedWords = await getBannedWords(guildId);
      const enabled = await isAutomodEnabled(guildId);
      const inviteBlock = await isInviteBlockEnabled(guildId);
      const advertisementBan = await getAdvertisementBanThreshold(guildId);

      const penaltyText = advertisementBan
        ? 'Reklam cezası: **3 ihlal -> yasaklama**'
        : 'Reklam cezası: **Sadece uyarı**';

      const header = `📋 Automod ${enabled ? 'acik' : 'kapali'} durumda.`;
      const footer = `Reklam engeli: **${inviteBlock ? 'Açık' : 'Kapalı'}**. ${penaltyText}`;

      const listText = bannedWords.length
        ? `${header}\n• ${bannedWords.join('\n• ')}\n\n${footer}\nDiscord\'un yerlesik otomatik moderasyonunu ayarlamak icin \`/discord-otomod\` komutunu kullanabilirsin.`
        : `${header} Henuz yasakli kelime bulunmuyor. ${footer}. Yerlesik sistem icin \`/discord-otomod\` komutunu deneyebilirsin.`;

      await interaction.reply({ content: listText, ephemeral: true });
    }
  }
};
