import { SlashCommandBuilder, MessageFlags } from 'discord.js';

export default {
  category: 'Müzik',
  data: new SlashCommandBuilder().setName('ayril').setDescription('Furmin müzikten çıkar.'),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const queue = interaction.client.music.getQueue(interaction.guildId);
    if (!queue || (!queue.nowPlaying && queue.size === 0 && !queue.connection)) {
      await interaction.editReply({ content: '👋 Furmin zaten müzik kanalında değil.' });
      return;
    }

    const memberChannel = interaction.member?.voice?.channel;
    if (!memberChannel || queue.voiceChannelId !== memberChannel.id) {
      await interaction.editReply({ content: '🎧 Furmin’i çıkarmak için aynı ses kanalında olmalısın.' });
      return;
    }

    queue.leave();
    await interaction.editReply({ content: '👋 Furmin ses kanalından ayrıldı ve müzik kuyruğu temizlendi.' });
  }
};
