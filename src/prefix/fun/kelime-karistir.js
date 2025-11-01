import { buildShuffleResult } from '../../commands/fun/kelime-karistir.js';

export default {
  name: 'karistir',
  aliases: ['kelime-karistir'],
  catalogKey: 'kelime-karistir',
  category: 'Eğlence',
  description: 'Yazdığın metni rastgele karıştırır.',
  menuGroup: 'Mini Oyunlar',
  async execute(message, args) {
    const text = args.join(' ');
    if (!text) {
      await message.reply({
        content: 'Karıştırmak istediğin metni yazmalısın. Örnek: `f!karistir Furmin harika`',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    try {
      const result = buildShuffleResult(text);
      await message.reply({
        content: `🔤 **Orijinal:** ${result.original}\n🔁 **Karışık:** ${result.shuffled}`,
        allowedMentions: { repliedUser: false }
      });
    } catch {
      await message.reply({
        content: 'Karıştırmak için geçerli bir metin yazmalısın.',
        allowedMentions: { repliedUser: false }
      });
    }
  }
};
