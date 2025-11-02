import { SlashCommandBuilder, MessageFlags } from 'discord.js';

function ensureVoiceChannel(interaction, queue) {
  const memberChannel = interaction.member?.voice?.channel;
  if (!memberChannel) {
    return { ok: false, message: '🎧 Önce bir ses kanalına katılmalısın.' };
  }

  if (!queue || !queue.voiceChannelId) {
    return { ok: true, channel: memberChannel };
  }

  if (queue.voiceChannelId !== memberChannel.id) {
    return {
      ok: false,
      message: '🎶 Müzik şu anda başka bir kanalda çalıyor. Aynı kanala katılmadan atlayamazsın.'
    };
  }

  return { ok: true, channel: memberChannel };
}

export default {
  category: 'Müzik',
  data: new SlashCommandBuilder().setName('atla').setDescription('Çalan şarkıyı atlar.'),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const queue = interaction.client.music.getQueue(interaction.guildId);
    if (!queue || !queue.nowPlaying) {
      await interaction.editReply({ content: '⏸️ Şu anda çalan bir şarkı yok.' });
      return;
    }

    const voiceCheck = ensureVoiceChannel(interaction, queue);
    if (!voiceCheck.ok) {
      await interaction.editReply({ content: voiceCheck.message });
      return;
    }

    const current = queue.nowPlaying;
    const upcoming = queue.snapshot().upcoming;
    queue.skip();

    if (upcoming.length > 0) {
      await interaction.editReply({
        content: `⏭️ **${current.title ?? 'Mevcut şarkı'}** atlandı. Sıradaki: **${upcoming[0].title ?? 'Bilinmeyen şarkı'}**.`
      });
    } else {
      await interaction.editReply({
        content: `⏭️ **${current.title ?? 'Mevcut şarkı'}** atlandı. Kuyrukta başka şarkı yok.`
      });
    }
  }
};
