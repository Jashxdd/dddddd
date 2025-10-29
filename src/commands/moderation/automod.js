import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import {
  addBannedWord,
  getBannedWords,
  isAutomodEnabled,
  removeBannedWord,
  setAutomodEnabled
} from '../../utils/automodConfig.js';

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

      await interaction.reply({
        content: enabled
          ? '✅ Otomatik moderasyon etkinlestirildi. Yasakli kelimeler tespit edildiginde mesajlar otomatik silinecek.'
          : '⏹️ Otomatik moderasyon devre disi birakildi.',
        ephemeral: true
      });
      return;
    }

    if (subcommand === 'kelime-ekle') {
      const word = interaction.options.getString('kelime');
      const result = await addBannedWord(guildId, word);

      if (result.added) {
        if (!(await isAutomodEnabled(guildId))) {
          await interaction.reply({
            content:
              '✅ Kelime listeye eklendi. Not: Automod su anda kapali, `/otomod durum secim:ac` komutu ile etkinlestirebilirsin.',
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: '✅ Kelime listeye eklendi ve otomatik olarak izleniyor.',
            ephemeral: true
          });
        }
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
      return;
    }

    if (subcommand === 'liste') {
      const bannedWords = await getBannedWords(guildId);
      const enabled = await isAutomodEnabled(guildId);

      await interaction.reply({
        content:
          bannedWords.length > 0
            ? `📋 Automod ${enabled ? 'acik' : 'kapali'} durumda. Yasakli kelimeler:\n• ${bannedWords.join('\n• ')}\n\nDiscord\'un yerlesik otomatik moderasyonunu ayarlamak icin \`/discord-otomod\` komutunu kullanabilirsin.`
            : `📋 Automod ${enabled ? 'acik' : 'kapali'} durumda. Henuz yasakli kelime bulunmuyor. Yerlesik sistem icin \`/discord-otomod\` komutunu deneyebilirsin.`,
        ephemeral: true
      });
    }
  }
};
