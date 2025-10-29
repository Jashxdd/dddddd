import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  category: 'Kullanici',
  data: new SlashCommandBuilder()
    .setName('yardim')
    .setDescription('Komut listesini ve kategorileri gosterir.'),
  async execute(interaction) {
    const categories = Array.from(interaction.client.commandCategories.entries()).sort(([a], [b]) =>
      a.localeCompare(b, 'tr')
    );

    const totalCommands = Array.from(interaction.client.commands.keys()).length;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Komut Yardimi')
      .setDescription(
        `Bu bot tum ozellikleri tek bir projede toplar. Toplam **${totalCommands}** slash komutu bulunuyor ve kategorilere gore listelenmistir. Kurallari kabul ettikten sonra tum komutlari kullanabilirsin.`
      );

    for (const [category, commands] of categories) {
      embed.addFields({
        name: category,
        value: commands.map((commandName) => `• /${commandName}`).join('\n') || 'Komut yok',
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
