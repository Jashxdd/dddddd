import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

async function resolveVoiceChannel(message) {
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
    throw new Error('Bu kanala bağlanmak için gerekli izinlere sahip değilim.');
  }

  return channel;
}

export default {
  name: 'muzik-katil',
  aliases: ['katil', 'summon', 'gel'],
  category: 'Müzik',
  menuGroup: 'Müzik',
  description: 'Furmin\'i bulunduğun ses kanalına davet eder.',
  proOnly: true,
  async execute(message) {
    if (!message.inGuild()) {
      await message.reply({
        content: 'Bu komut yalnızca sunucularda kullanılabilir.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    try {
      const voiceChannel = await resolveVoiceChannel(message);
      const result = await message.client.music.summon({
        guild: message.guild,
        voiceChannel,
        textChannel: message.channel,
        requestedBy: message.author.id
      });

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setAuthor({ name: 'Furmin Müzik' })
        .setTitle('Ses bağlantısı hazır')
        .setDescription(
          result.moved
            ? '💎 Furmin istek üzerine yeni kanalına taşındı ve müzik için hazır.'
            : '💎 Furmin ses kanalında hazır bekliyor. Dilediğin zaman müzik başlatabilirsin.'
        )
        .setFooter({ text: 'Furmin Müzik Sistemi' })
        .setTimestamp();

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    } catch (error) {
      await message.reply({
        content: `⛔ ${error.message}`,
        allowedMentions: { repliedUser: false }
      });
    }
  }
};
