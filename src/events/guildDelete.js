import { EmbedBuilder, Events } from 'discord.js';
import { sendBotLog } from '../utils/botLog.js';
import { clearInviteCache } from '../utils/inviteCache.js';

export default {
  name: Events.GuildDelete,
  async execute(guild, client) {
    const embed = new EmbedBuilder()
      .setColor(0x95a5a6)
      .setTitle('Sunucudan Ayrılma Kaydı')
      .setDescription('Furmin bir sunucudan çıkarıldı veya sunucu kapatıldı.')
      .addFields(
        { name: 'Sunucu Adı', value: guild?.name ?? 'Bilinmiyor', inline: true },
        { name: 'Sunucu ID', value: guild?.id ?? 'Bilinmiyor', inline: true },
        {
          name: 'Üye Sayısı',
          value: typeof guild?.memberCount === 'number' ? `${guild.memberCount}` : 'Bilinmiyor',
          inline: true
        }
      )
      .setTimestamp();

    await sendBotLog(client, { embeds: [embed] });
    if (guild?.id) {
      clearInviteCache(guild.id);
    }
  }
};
