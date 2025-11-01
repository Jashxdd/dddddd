import { spinReels, evaluateSpin } from '../../commands/fun/slot.js';

export default {
  name: 'slot',
  aliases: ['slotmakinesi'],
  catalogKey: 'slot',
  category: 'Eğlence',
  description: 'Furmin slot makinesini çevir.',
  menuGroup: 'Mini Oyunlar',
  async execute(message) {
    const spin = spinReels();
    const outcome = evaluateSpin(spin);

    await message.reply({
      content: `${outcome.title}\n${outcome.message}\nSonuç: ${spin.join(' │ ')}`,
      allowedMentions: { repliedUser: false }
    });
  }
};
