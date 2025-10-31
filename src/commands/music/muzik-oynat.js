import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

async function ensureVoice(interaction) {
  if (!interaction.guild) {
    throw new Error('Bu komut yalnızca sunucularda kullanılabilir.');
  }

  const guild = interaction.guild;
  const member =
    guild.members.cache.get(interaction.user.id) ?? (await guild.members.fetch(interaction.user.id).catch(() => null));

  if (!member?.voice?.channel) {
    throw new Error('Bir ses kanalına bağlı değilsin. Lütfen önce bir kanala katıl.');
  }

  const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
  if (!me) {
    throw new Error('Bot bilgileri alınamadı.');
  }

  const permissions = member.voice.channel.permissionsFor(me);
  if (!permissions?.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
    throw new Error('Bu ses kanalına bağlanmak için izinlerim eksik.');
  }

  return member.voice.channel;
}

function createResponseEmbed({ track, queued, position }) {
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setAuthor({ name: 'Furmin Müzik' })
    .setTitle(track.title)
    .setURL(track.url)
    .setDescription(queued ? `Sıraya eklendi. Konum: **${position + 1}**` : 'Şimdi çalınıyor.');

  if (track.author) {
    embed.addFields({ name: 'Kanal', value: track.author, inline: true });
  }

  if (track.durationInSec) {
    const minutes = Math.floor(track.durationInSec / 60);
    const seconds = track.durationInSec % 60;
    embed.addFields({ name: 'Süre', value: `${minutes}:${seconds.toString().padStart(2, '0')}`, inline: true });
  }

  embed.setFooter({ text: 'Furmin Müzik Sistemi' }).setTimestamp();
  return embed;
}

export default {
  category: 'Müzik',
  menuGroup: 'Müzik',
  data: new SlashCommandBuilder()
    .setName('muzik-oynat')
    .setDescription('Belirttiğin şarkıyı çalar veya sıraya ekler.')
    .addStringOption((option) =>
      option
        .setName('parca')
        .setDescription('Youtube bağlantısı veya arama terimi')
        .setRequired(true)
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    let voiceChannel;
    try {
      voiceChannel = await ensureVoice(interaction);
    } catch (error) {
      await interaction.reply({ content: `⛔ ${error.message}`, ephemeral: true });
      return;
    }

    const query = interaction.options.getString('parca', true);
    await interaction.deferReply();

    try {
      const result = await interaction.client.music.addTrack({
        guild: interaction.guild,
        voiceChannel,
        textChannel: interaction.channel,
        query,
        requestedBy: interaction.user.id
      });

      const embed = createResponseEmbed(result);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Müzik oynatılırken hata oluştu:', error);
      await interaction.editReply({ content: `Şarkı oynatılırken hata oluştu: ${error.message}` });
    }
  }
};
