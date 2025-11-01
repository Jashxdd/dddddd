import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';

async function ensureVoice(message) {
  const cachedMember = message.member ?? message.guild.members.cache.get(message.author.id);
  const member = cachedMember ?? (await message.guild.members.fetch(message.author.id).catch(() => null));

  const cachedVoice = message.guild.voiceStates?.cache?.get(message.author.id);
  const resolvedVoice = cachedVoice ?? (await message.guild.voiceStates?.fetch?.(message.author.id).catch(() => null));
  const channel = member?.voice?.channel ?? resolvedVoice?.channel ?? null;

  if (!channel) {
    throw new Error('Önce bir ses kanalına katılmalısın.');
  }

  const me = message.guild.members.me ?? (await message.guild.members.fetchMe().catch(() => null));
  if (!me) throw new Error('Bot üye bilgisi alınamadı.');
  const permissions = channel.permissionsFor(me);
  if (!permissions?.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
    throw new Error('Bu kanala bağlanmak için izinlerim eksik.');
  }

  return channel;
}

function buildEmbed(result) {
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setAuthor({ name: 'Furmin Müzik' })
    .setTitle(result.track.title)
    .setURL(result.track.url)
    .setDescription(result.queued ? `Sıraya eklendi. Konum: **${(result.position ?? 0) + 1}**` : 'Şimdi çalınıyor.')
    .setFooter({ text: 'Furmin Müzik Sistemi' })
    .setTimestamp();
  return embed;
}

export default {
  name: 'muzik-oynat',
  aliases: ['oynat', 'play'],
  category: 'Müzik',
  menuGroup: 'Müzik',
  description: 'Belirttiğin şarkıyı çalar veya sıraya ekler.',
  async execute(message, args) {
    if (!message.inGuild()) {
      await message.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', allowedMentions: { repliedUser: false } });
      return;
    }

    const query = args.join(' ').trim();
    if (!query) {
      await message.reply({ content: 'Lütfen bir bağlantı veya arama terimi yaz.', allowedMentions: { repliedUser: false } });
      return;
    }

    try {
      const voiceChannel = await ensureVoice(message);
      const result = await message.client.music.addTrack({
        guild: message.guild,
        voiceChannel,
        textChannel: message.channel,
        query,
        requestedBy: message.author.id
      });

      const embed = buildEmbed(result);
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    } catch (error) {
      await message.reply({ content: `⛔ ${error.message}`, allowedMentions: { repliedUser: false } });
    }
  }
};
