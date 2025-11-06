import { SlashCommandBuilder, EmbedBuilder, time } from 'discord.js';

export default {
  category: 'Genel',
  data: new SlashCommandBuilder()
    .setName('rol-bilgi')
    .setDescription('Belirtilen rol hakkinda detayli bilgi verir.')
    .addRoleOption((option) => option.setName('rol').setDescription('Bilgi almak istedigin rol').setRequired(true)),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komutu sadece sunucularda kullanabilirsin.', ephemeral: true });
      return;
    }

    const role = interaction.options.getRole('rol', true);

    const embed = new EmbedBuilder()
      .setColor(role.color || 0x95a5a6)
      .setTitle(`🎯 ${role.name}`)
      .addFields(
        { name: 'ID', value: role.id, inline: true },
        { name: 'Renk', value: role.color ? role.hexColor : 'Belirtilmemis', inline: true },
        { name: 'Düzenlenen', value: role.hoist ? 'Ayrı gösteriliyor' : 'Normal', inline: true },
        { name: 'Mention', value: role.mentionable ? 'Herkes mentionlayabilir' : 'Yalnızca yetkili mentionlar', inline: true },
        { name: 'Üyeler', value: `${role.members.size} kisi`, inline: true },
        { name: 'Oluşturulma', value: time(Math.floor(role.createdTimestamp / 1000), 'F'), inline: false }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
