import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  data: new SlashCommandBuilder()
    .setName('pro-rol-analiz')
    .setDescription('En çok üyeye sahip rolleri ve üye sayılarını listeler.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const roles = interaction.guild.roles.cache
      .filter((role) => !role.managed && role.id !== interaction.guildId)
      .sort((a, b) => b.members.size - a.members.size)
      .first(5);

    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle('🧮 Pro Rol Analizi')
      .setDescription('En kalabalık rolleri ve üye sayılarını gösterir.')
      .setFooter({ text: 'Furmin Pro rol raporu' })
      .setTimestamp();

    if (roles && roles.length) {
      embed.addFields({
        name: 'Öne Çıkan Roller',
        value: roles.map((role, index) => `#${index + 1} ${role} — ${role.members.size} üye`).join('\n')
      });
    } else {
      embed.addFields({ name: 'Durum', value: 'Analiz edilebilecek rol bulunamadı.' });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
