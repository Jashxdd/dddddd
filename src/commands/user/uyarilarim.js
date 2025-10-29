import { SlashCommandBuilder, time } from 'discord.js';
import { listWarnings } from '../../utils/warnStorage.js';

export default {
  category: 'Kullanici',
  data: new SlashCommandBuilder().setName('uyarilarim').setDescription('Kendi uyari kayitlarini goruntuler.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut sadece sunucularda kullanilabilir.', ephemeral: true });
      return;
    }

    const warnings = await listWarnings(interaction.guildId, interaction.user.id);
    if (!warnings.length) {
      await interaction.reply({ content: '✅ Sunucuda kayitli uyarin bulunmuyor.', ephemeral: true });
      return;
    }

    const lines = warnings.map((warning, index) => {
      const timestamp = time(Math.floor(new Date(warning.createdAt).getTime() / 1000));
      return `**${index + 1}.** ${warning.reason} — Yetkili: <@${warning.moderatorId}> (${timestamp})`;
    });

    await interaction.reply({
      content: `📋 Kayitli ${warnings.length} uyarin bulunuyor:\n${lines.join('\n')}`,
      ephemeral: true
    });
  }
};
