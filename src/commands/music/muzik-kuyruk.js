import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  category: 'Müzik',
  menuGroup: 'Müzik',
  data: new SlashCommandBuilder().setName('muzik-kuyruk').setDescription('Sıradaki şarkıları listeler.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const snapshot = interaction.client.music.getQueueSnapshot(interaction.guildId);
    if (!snapshot) {
      await interaction.reply({ content: '🎵 Aktif bir müzik kuyruğu bulunmuyor.', ephemeral: true });
      return;
    }

    const lines = snapshot.upcoming.length
      ? snapshot.upcoming.map((track, index) => `**${index + 1}.** [${track.title}](${track.url}) — <@${track.requestedBy}>`)
      : ['Sırada parça yok.'];

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle('📜 Müzik Kuyruğu')
      .addFields({
        name: 'Şu anda',
        value: snapshot.current ? `[${snapshot.current.title}](${snapshot.current.url})` : 'Çalan parça yok.'
      })
      .addFields({ name: 'Sıradakiler', value: lines.join('\n') })
      .setFooter({ text: 'Furmin Müzik Sistemi' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
