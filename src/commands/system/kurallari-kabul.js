import { SlashCommandBuilder } from 'discord.js';
import { acceptRules, hasAcceptedRules } from '../../utils/rulesStorage.js';

export default {
  category: 'Sistem',
  data: new SlashCommandBuilder()
    .setName('kurallari-kabul')
    .setDescription('Bot komutlarini kullanmadan once sunucu kurallarini kabul et.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'Bu komut yalnizca bir sunucu icinde kullanilabilir.',
        ephemeral: true
      });
      return;
    }

    const { guildId, user } = interaction;

    if (await hasAcceptedRules(guildId, user.id)) {
      await interaction.reply({
        content: '✅ Zaten kurallari kabul etmis görünüyorsun. Tüm komutlari kullanabilirsin.',
        ephemeral: true
      });
      return;
    }

    const { alreadyAccepted } = await acceptRules(guildId, user.id);
    const message = alreadyAccepted
      ? '✅ Kurallari daha once kabul etmistin. Komutlari kullanabilirsin.'
      : '✅ Kurallar basariyla kabul edildi! Artik botun tum slash komutlarini kullanabilirsin.';

    await interaction.reply({
      content: message,
      ephemeral: true
    });
  }
};
