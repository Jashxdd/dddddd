import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export function buildColorRolesEmbed(guild) {
  const colorRoles = guild.roles.cache
    .filter((role) => role.color && role.id !== guild.id)
    .sort((a, b) => b.position - a.position)
    .map((role) => ({ name: role.name, color: role.hexColor, mention: role.toString() }));

  const embed = new EmbedBuilder()
    .setColor(0x1abc9c)
    .setTitle('🎨 Renk Rolleri')
    .setDescription('Sunucuda tanımlı renk rolleri ve hex kodları aşağıdadır.')
    .setTimestamp();

  if (!colorRoles.length) {
    embed.addFields({ name: 'Bulunamadı', value: 'Sunucuda renk rolü tanımlı değil.' });
  } else {
    const lines = colorRoles.map((role) => `${role.mention} — ${role.color}`);
    embed.addFields({ name: `Toplam ${colorRoles.length} rol`, value: lines.slice(0, 25).join('\n') });
    if (colorRoles.length > 25) {
      embed.setFooter({ text: `İlk 25 rol gösteriliyor. Toplam: ${colorRoles.length}` });
    }
  }

  return embed;
}

export default {
  category: 'Genel',
  menuGroup: 'Kullanıcı Sistemleri',
  data: new SlashCommandBuilder().setName('lrenk').setDescription('Renk rolleri ve kodlarını listeler.'),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const embed = buildColorRolesEmbed(interaction.guild);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
