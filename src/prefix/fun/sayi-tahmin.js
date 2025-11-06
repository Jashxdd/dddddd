import { clampRange, rollNumber } from '../../commands/fun/sayi-tahmin.js';

export default {
  name: 'tahmin',
  aliases: ['sayi-tahmin'],
  catalogKey: 'sayi-tahmin',
  category: 'Eğlence',
  description: 'Rastgele tutulan sayıyı tahmin etmeye çalış.',
  menuGroup: 'Mini Oyunlar',
  async execute(message, args) {
    const guessValue = Number.parseInt(args[0] ?? '', 10);
    const maxValue = clampRange(Number.parseInt(args[1] ?? '', 10) || 10);

    if (Number.isNaN(guessValue)) {
      await message.reply({
        content: 'Bir sayı tahmini yazmalısın. Örnek kullanım: `f!tahmin 7 20`',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (guessValue < 1 || guessValue > maxValue) {
      await message.reply({
        content: `Tahminin 1 ile ${maxValue} arasında olmalı.`,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const target = rollNumber(maxValue);
    const diff = Math.abs(guessValue - target);
    const success = diff === 0;

    const lines = [success ? '🥳 Tam İsabet!' : diff === 1 ? '😮 Çok Yaklaştın!' : '🎲 Bir Dahaki Sefa'];
    lines.push(`Çekilen sayı **${target}**, tahminin **${guessValue}**.`);
    if (!success && diff === 1) {
      lines.push('Sadece 1 farkla kaçırdın!');
    }
    lines.push(`Aralık: 1 - ${maxValue}`);

    await message.reply({
      content: lines.join('\n'),
      allowedMentions: { repliedUser: false }
    });
  }
};
