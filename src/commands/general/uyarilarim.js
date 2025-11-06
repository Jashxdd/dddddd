import { SlashCommandBuilder, EmbedBuilder, time } from 'discord.js';
import { listWarnings } from '../../utils/warnStorage.js';

export default {
  category: 'Genel',
  data: new SlashCommandBuilder().setName('uyarilarim').setDescription('Sunucudaki kendi uyari kayitlarini goruntuler.'),
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

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle('📋 Uyari Kayitlarin')
      .setDescription(
        warnings
          .map((warning, index) => {
            const timestamp = time(Math.floor(new Date(warning.createdAt).getTime() / 1000));
            return `**${index + 1}.** ${warning.reason}\nYetkili: <@${warning.moderatorId}> — ${timestamp}`;
          })
          .join('\n\n')
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
