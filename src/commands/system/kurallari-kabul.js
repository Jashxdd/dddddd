import { SlashCommandBuilder } from 'discord.js';
import { acceptRules, hasAcceptedRules } from '../../utils/rulesStorage.js';

export default {
  category: 'Sistem',
  data: new SlashCommandBuilder()
    .setName('kurallari-kabul')
    .setDescription('Bot komutlarını kullanmadan önce sunucu kurallarını kabul et.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'Bu komut yalnızca bir sunucu içinde kullanılabilir.',
        ephemeral: true
      });
      return;
    }

    const { guildId, user } = interaction;

    if (await hasAcceptedRules(guildId, user.id)) {
      await interaction.reply({
        content: '✅ Zaten kuralları kabul etmiş görünüyorsun. Tüm komutları kullanabilirsin.',
        ephemeral: true
      });
      return;
    }

    const { alreadyAccepted } = await acceptRules(guildId, user.id);
    const message = alreadyAccepted
      ? '✅ Kuralları daha önce kabul etmiştin. Komutları kullanabilirsin.'
      : '✅ Kurallar başarıyla kabul edildi! Artık botun tüm slash komutlarını kullanabilirsin.';

    await interaction.reply({
      content: message,
      ephemeral: true
    });
  }
};
