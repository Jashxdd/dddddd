import { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { config } from '../config.js';
import { sendBotLog } from '../utils/botLog.js';
import { snapshotInvites } from '../utils/inviteCache.js';

async function sendOwnerGreeting(guild) {
  try {
    const owner = guild.owner ?? (await guild.fetchOwner());
    if (!owner) {
      return { delivered: false, reason: 'Sahip bulunamadı.' };
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('Furmin ile tanıştığınız için teşekkürler!')
      .setDescription(
        'Merhaba! Furmin olarak topluluğunuza destek olmak için buradayım. ' +
          'Komutlarımı görmek için sunucunuzda `f!yardim` yazabilirsiniz.'
      )
      .addFields({
        name: 'Hızlı Başlangıç',
        value:
          '• Kuralları düzenlemek için `f!kurallar`\n' +
          '• Bakım ve raporlar için `f!furmin-merkez`\n' +
          '• Ekonomi ve eğlence komutlarını keşfetmek için `f!yardim` menüsünü kullanın.'
      })
      .setFooter({ text: 'Sorularınız olursa destek ekibimize ulaşabilirsiniz.' })
      .setTimestamp();

    const buttons = [];
    if (config.supportServerUrl) {
      buttons.push(
        new ButtonBuilder()
          .setLabel('Destek Sunucusu')
          .setEmoji('🛠️')
          .setStyle(ButtonStyle.Link)
          .setURL(config.supportServerUrl)
      );
    }

    if (config.inviteUrl) {
      buttons.push(
        new ButtonBuilder()
          .setLabel('Furmin\'i Davet Et')
          .setEmoji('🤖')
          .setStyle(ButtonStyle.Link)
          .setURL(config.inviteUrl)
      );
    }

    const components = buttons.length
      ? [new ActionRowBuilder().addComponents(...buttons.slice(0, 5))]
      : [];

    await owner.send({
      content: `Merhaba ${owner.displayName}! Furmin'i sunucunuza eklediğiniz için teşekkür ederiz.`,
      embeds: [embed],
      components
    });

    return { delivered: true };
  } catch (error) {
    console.warn('Sunucu sahibine tanıtım mesajı gönderilemedi:', error);
    return { delivered: false, reason: error?.message ?? 'Bilinmeyen hata' };
  }
}

export default {
  name: Events.GuildCreate,
  async execute(guild, client) {
    const greetingResult = await sendOwnerGreeting(guild);

    const resolvedClient = client ?? guild.client;

    try {
      const me = guild.members.me ?? (await guild.members.fetch(resolvedClient.user.id));
      if (me?.permissions.has(PermissionFlagsBits.ManageGuild)) {
        const invites = await guild.invites.fetch().catch(() => null);
        if (invites) {
          snapshotInvites(guild.id, invites);
        }
      }
    } catch (error) {
      console.warn(`Yeni sunucu davetleri alınamadı (${guild.id}):`, error);
    }

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('Yeni Sunucuya Eklendi')
      .setDescription(`Furmin **${guild.name}** sunucusuna katıldı.`)
      .addFields(
        { name: 'Sunucu ID', value: guild.id, inline: true },
        { name: 'Üye Sayısı', value: `${guild.memberCount ?? 'Bilinmiyor'}`, inline: true },
        {
          name: 'Tanıtım DM Durumu',
          value: greetingResult.delivered ? '✅ Mesaj iletildi.' : `⚠️ İletilemedi: ${greetingResult.reason ?? 'bilinmiyor'}`,
          inline: false
        }
      )
      .setTimestamp();

    await sendBotLog(client, { embeds: [embed] });
  }
};
