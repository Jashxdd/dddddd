import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  category: 'Genel',
  data: new SlashCommandBuilder().setName('roller').setDescription('Sunucudaki rolleri en yuksekten asagiya siralar.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komutu sadece sunucularda kullanabilirsin.', ephemeral: true });
      return;
    }

    const roles = interaction.guild.roles.cache
      .filter((role) => role.id !== interaction.guild.id)
      .sort((a, b) => b.position - a.position);

    if (roles.size === 0) {
      await interaction.reply({ content: 'Bu sunucuda hic rol bulunmuyor.', ephemeral: true });
      return;
    }

    const listed = roles.map((role) => `${role} — ${role.members.size} uye`).slice(0, 20);

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle('🏷️ Rol Siralamasi')
      .setDescription(listed.join('\n'))
      .setFooter({ text: `${roles.size} rol bulundu. En fazla 20 tanesi listelendi.` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
