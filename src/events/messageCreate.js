import { Events, PermissionsBitField } from 'discord.js';
import { findBannedWordInContent, isAutomodEnabled } from '../utils/automodConfig.js';

export default {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild || message.author.bot) return;

    const enabled = await isAutomodEnabled(message.guild.id);
    if (!enabled) return;

    if (!message.content) return;

    const matchedWord = await findBannedWordInContent(message.guild.id, message.content);
    if (!matchedWord) return;

    if (message.deletable) {
      await message.delete().catch(() => {});
    }

    const canSend = message.channel
      .permissionsFor(message.client.user)
      ?.has(PermissionsBitField.Flags.SendMessages);

    if (!canSend) return;

    await message.channel.send({
      content: `⚠️ ${message.author}, yasakli bir ifade (**${matchedWord}**) kullandigin icin mesajin silindi. Lutfen sunucu kurallarina uy.`
    });
  }
};
