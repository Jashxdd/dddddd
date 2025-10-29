import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export default {
  category: 'Genel',
  data: new SlashCommandBuilder().setName('emojiler').setDescription('Sunucudaki tum özel emojileri listeler.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komutu sadece sunucularda kullanabilirsin.', ephemeral: true });
      return;
    }

    const emojis = interaction.guild.emojis.cache.map((emoji) => emoji.toString());

    if (emojis.length === 0) {
      await interaction.reply({ content: 'Bu sunucuda hic özel emoji bulunmuyor.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('😄 Sunucu Emojileri')
      .setDescription(`Toplam ${emojis.length} emoji bulundu.`);

    const emojiChunks = chunk(emojis, 20);

    emojiChunks.forEach((group, index) => {
      embed.addFields({ name: `Grup ${index + 1}`, value: group.join(' '), inline: false });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
