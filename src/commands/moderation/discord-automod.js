import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { disableKeywordRule, getKeywordRuleInfo, parseKeywords, upsertKeywordRule } from '../../utils/discordAutomod.js';

export default {
  category: 'Moderasyon',
  data: new SlashCommandBuilder()
    .setName('discord-otomod')
    .setDescription('Discord\'un otomatik moderasyon sistemini yonetir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('kelime-filtresi')
        .setDescription('Belirledigin kelimeler icin otomatik mesaj engelleme kuralini kurar veya gunceller.')
        .addStringOption((option) =>
          option
            .setName('kelimeler')
            .setDescription('Virgul ile ayrilmis kelime listesi (ornegin: spam, reklam, bedava)')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('uyari-mesaji')
            .setDescription('Kural tetiklendigi zaman gosterilecek ozellesmis mesaj (opsiyonel).')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('devre-disi').setDescription('Kelime filtresi kuralini devre disi birakir.')
    )
    .addSubcommand((sub) =>
      sub.setName('durum').setDescription('Kuralin durumunu ve anahtar kelimeleri gosterir.')
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'Bu komut sadece bir sunucu icinde kullanilabilir.',
        ephemeral: true
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'kelime-filtresi') {
      const keywordInput = interaction.options.getString('kelimeler', true);
      let keywords;

      try {
        keywords = parseKeywords(keywordInput);
      } catch (error) {
        await interaction.reply({ content: `⚠️ ${error.message}`, ephemeral: true });
        return;
      }

      const customMessage = interaction.options.getString('uyari-mesaji') ?? undefined;

      await interaction.deferReply({ ephemeral: true });

      await upsertKeywordRule(interaction.guild, keywords, customMessage);

      await interaction.editReply({
        content: `✅ Discord otomatik moderasyon kelime filtresi guncellendi. Aktif kelime sayisi: **${keywords.length}**.`
      });
      return;
    }

    if (subcommand === 'devre-disi') {
      await interaction.deferReply({ ephemeral: true });
      const disabled = await disableKeywordRule(interaction.guild);

      await interaction.editReply({
        content: disabled
          ? '⏹️ Kelime filtresi devre disi birakildi. Dilersen `/discord-otomod kelime-filtresi` ile yeniden etkinlestirebilirsin.'
          : 'ℹ️ Bu sunucuda devre disi birakilacak bir kelime filtresi bulunamadi.'
      });
      return;
    }

    if (subcommand === 'durum') {
      await interaction.deferReply({ ephemeral: true });
      const info = await getKeywordRuleInfo(interaction.guild);

      if (!info.exists) {
        await interaction.editReply({
          content: 'ℹ️ Bu sunucuda bot tarafindan olusturulmus bir kelime filtresi kuralı bulunmuyor.'
        });
        return;
      }

      const keywordList = info.keywords.map((item) => `• ${item}`).join('\n') || 'Kayitli kelime yok.';
      await interaction.editReply({
        content: `📋 Kural durumu: **${info.enabled ? 'Aktif' : 'Pasif'}**\nAnahtar kelimeler:\n${keywordList}`
      });
    }
  }
};
