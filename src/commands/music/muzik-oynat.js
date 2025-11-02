import { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

async function ensureVoice(interaction) {
  if (!interaction.guild) {
    throw new Error('Bu komut yalnızca sunucularda kullanılabilir.');
  }

  const guild = interaction.guild;
  const cachedMember = interaction.member ?? guild.members.cache.get(interaction.user.id);
  const member = cachedMember ?? (await guild.members.fetch(interaction.user.id).catch(() => null));

  const cachedVoice = guild.voiceStates?.cache?.get(interaction.user.id);
  const resolvedVoiceState =
    cachedVoice ?? (await guild.voiceStates?.fetch?.(interaction.user.id).catch(() => null));

  const voiceChannel = member?.voice?.channel ?? resolvedVoiceState?.channel ?? null;

  if (!voiceChannel) {
    throw new Error('Bir ses kanalına bağlı değilsin. Lütfen önce bir kanala katıl.');
  }

  const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
  if (!me) {
    throw new Error('Bot bilgileri alınamadı.');
  }

  const permissions = voiceChannel.permissionsFor(me);
  if (!permissions?.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
    throw new Error('Bu ses kanalına bağlanmak için izinlerim eksik.');
  }

  return voiceChannel;
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

  if (track.playlist?.name) {
    const playlistUrl = track.playlist.url ?? track.originalQuery ?? track.url;
    const label = playlistUrl ? `[${track.playlist.name}](${playlistUrl})` : track.playlist.name;
    embed.addFields({ name: 'Çalma Listesi', value: label, inline: true });
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
        .setName('query')
        .setDescription('YouTube bağlantısı veya arama terimi')
        .setRequired(true)
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'Bu komut yalnızca sunucularda kullanılabilir.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    let voiceChannel;
    try {
      voiceChannel = await ensureVoice(interaction);
    } catch (error) {
      await interaction.reply({
        content: `⛔ ${error.message}`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const rawQuery = interaction.options.getString('query', true);
    const query = rawQuery?.trim();

    if (!query) {
      await interaction.reply({
        content: 'Lütfen geçerli bir bağlantı veya arama terimi gir.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

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
