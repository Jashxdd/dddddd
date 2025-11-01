import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

function requireQueue(interaction) {
  const queue = interaction.client.music.getQueue(interaction.guildId);
  if (!queue || !queue.current) {
    throw new Error('Atlayacak bir parça yok. Önce `muzik-oynat` ile sıraya şarkı ekleyin.');
  }
  return queue;
}

export default {
  category: 'Müzik',
  menuGroup: 'Müzik',
  data: new SlashCommandBuilder().setName('muzik-atla').setDescription('Çalan şarkıyı atlar ve sıradaki parçaya geçer.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    try {
      requireQueue(interaction);
      await interaction.deferReply();
      const track = await interaction.client.music.skip(interaction.guildId);
      if (!track) {
        await interaction.editReply({ content: 'Sırada çalınacak şarkı kalmadı. Kuyruk temizlendi.' });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle('⏭️ Sıradaki Parça')
        .setDescription(`[${track.title}](${track.url})`)
        .setFooter({ text: 'Furmin Müzik Sistemi' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `⛔ ${error.message}` });
      } else {
        await interaction.reply({ content: `⛔ ${error.message}`, ephemeral: true });
      }
    }
  }
};
