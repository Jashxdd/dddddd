import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const symbols = ['🍒', '🍋', '🍇', '🔔', '⭐', '7️⃣'];

export function spinReels() {
  return Array.from({ length: 3 }, () => symbols[Math.floor(Math.random() * symbols.length)]);
}

export function evaluateSpin(spin) {
  const [a, b, c] = spin;
  if (a === b && b === c) {
    return { title: '🎰 Jackpot!', message: 'Üçlü eşleşme yakaladın. Şansın bol olsun!', color: 0xffc300 };
  }

  if (a === b || a === c || b === c) {
    return { title: '✨ Yakın Kaçtı!', message: 'İkili eşleşme yakaladın. Bir kez daha dene!', color: 0x9b59b6 };
  }

  return { title: '🙃 Şansını Zorla', message: 'Bu kez olmadı. Bir tur daha çevirmeye hazır mısın?', color: 0x95a5a6 };
}

export default {
  category: 'Eğlence',
  menuGroup: 'Mini Oyunlar',
  data: new SlashCommandBuilder().setName('slot').setDescription('Furmin slot makinesini çevir.'),
  async execute(interaction) {
    const spin = spinReels();
    const outcome = evaluateSpin(spin);

    const embed = new EmbedBuilder()
      .setColor(outcome.color)
      .setTitle(outcome.title)
      .setDescription(outcome.message)
      .addFields({ name: 'Sonuç', value: spin.join(' │ ') })
      .setFooter({ text: 'Furmin Eğlence Salonu • Üçlü eşleşme jackpot kazandırır.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
