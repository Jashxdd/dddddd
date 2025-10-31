import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export function buildRoleListEmbed(guild) {
  const roles = guild.roles.cache
    .filter((role) => role.id !== guild.id)
    .sort((a, b) => b.position - a.position);

  const embed = new EmbedBuilder().setColor(0x8e44ad).setTitle('🏷️ Rol Sıralaması');

  if (!roles.size) {
    embed.setDescription('Bu sunucuda hiç rol bulunmuyor.');
    return embed;
  }

  const listed = roles.map((role) => `${role} — ${role.members.size} üye`).slice(0, 20);
  embed.setDescription(listed.join('\n'));
  embed.setFooter({ text: `${roles.size} rol bulundu. En fazla 20 tanesi listelendi.` });
  return embed;
}

export default {
  category: 'Genel',
  data: new SlashCommandBuilder().setName('roller').setDescription('Sunucudaki rolleri en yuksekten asagiya siralar.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komutu sadece sunucularda kullanabilirsin.', ephemeral: true });
      return;
    }

    const embed = buildRoleListEmbed(interaction.guild);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
