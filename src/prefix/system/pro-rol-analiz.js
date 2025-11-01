import { EmbedBuilder } from 'discord.js';

export default {
  name: 'pro-rol-analiz',
  aliases: ['prorol', 'pro-rol'],
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  description: 'En çok üyeye sahip rolleri ve üye sayılarını listeler.',
  async execute(message) {
    const roles = message.guild.roles.cache
      .filter((role) => !role.managed && role.id !== message.guildId)
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

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
