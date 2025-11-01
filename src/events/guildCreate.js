import { Events, EmbedBuilder } from 'discord.js';
import { sendBotLog } from '../utils/botLog.js';

export default {
  name: Events.GuildCreate,
  async execute(guild, client) {
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('Yeni Sunucuya Eklendi')
      .setDescription(`Furmin **${guild.name}** sunucusuna katıldı.`)
      .addFields(
        { name: 'Sunucu ID', value: guild.id, inline: true },
        { name: 'Üye Sayısı', value: `${guild.memberCount ?? 'Bilinmiyor'}`, inline: true }
      )
      .setTimestamp();

    await sendBotLog(client, { embeds: [embed] });
  }
};
