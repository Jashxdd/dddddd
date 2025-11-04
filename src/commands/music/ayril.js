import { SlashCommandBuilder, MessageFlags } from 'discord.js';

export default {
  category: 'Müzik',
  data: new SlashCommandBuilder().setName('ayril').setDescription('Ses kanalından ayrılır ve kuyruğu kapatır.'),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const queue = interaction.client.music.getQueue(interaction.guildId);
    if (!queue) {
      await interaction.editReply({ content: '👋 Ayrılacak bir ses bağlantısı bulunmuyor.' });
      return;
    }

    queue.leave();
    await interaction.editReply({ content: '👋 Ses kanalından ayrıldım ve müzik oturumunu kapattım.' });
  }
};
