import { randomInt } from 'node:crypto';

const QUEST_SCENARIOS = [
  {
    prompt: 'Yeni gelenlere kılavuz hazırlayıp kanalları tanıttın.',
    result: 'Topluluk seni alkışladı ve FurCoin hediyesi gönderdi.'
  },
  {
    prompt: 'Destek kanalında üç farklı sorunu çözdün.',
    result: 'Üyeler teşekkür olarak bahşiş bıraktı.'
  },
  {
    prompt: 'Etkinlik planını gözden geçirip eksikleri tamamladın.',
    result: 'Organizasyon sorunsuz ilerledi, kasaya ekstra gelir girdi.'
  },
  {
    prompt: 'Rol panosunu güncelleyip yeni katılanları yönlendirdin.',
    result: 'Rol dağılımı hızlandı ve FurCoin bonusu kazanıldı.'
  },
  {
    prompt: 'Topluluk için motivasyon mesajı hazırladın.',
    result: 'İlham verdiğin üyeler gönüllü bağış yaptı.'
  }
];

const INVEST_SUCCESS_MESSAGES = [
  'Piyasayı doğru okudun, yatırımın yüzünü güldürdü.',
  'Furmin borsasında doğru hamleyi yaptın, kasanı büyüttün.',
  'Risk aldın ve kâr payı yüksek kapandı.'
];

const INVEST_FAIL_MESSAGES = [
  'Piyasadaki dalgalanma beklediğinden sert oldu, zarar yazıldı.',
  'Haber akışını yakalayamadın, yatırımın değer kaybetti.',
  'Piyasa kapandıktan sonra gelen haberler morali bozdu.'
];

const SUCCESS_MULTIPLIERS = [1.6, 1.8, 2.1];
const FAILURE_MULTIPLIERS = [0.2, 0.35, 0.5];

export const QUEST_COOLDOWN = 6 * 60 * 60 * 1000; // 6 saat
export const QUEST_REWARD_RANGE = [320, 560];
export const INVESTMENT_COOLDOWN = 30 * 60 * 1000; // 30 dakika
export const INVESTMENT_MINIMUM = 150;

function pickArrayItem(items) {
  if (!Array.isArray(items) || !items.length) return undefined;
  const index = randomInt(items.length);
  return items[index];
}

export function pickQuestScenario() {
  return pickArrayItem(QUEST_SCENARIOS) ?? QUEST_SCENARIOS[0];
}

export function calculateQuestReward() {
  const [min, max] = QUEST_REWARD_RANGE;
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

export function resolveInvestment(amount) {
  const successChance = 0.58;
  const success = Math.random() < successChance;
  if (success) {
    const multiplier = pickArrayItem(SUCCESS_MULTIPLIERS) ?? SUCCESS_MULTIPLIERS[0];
    const payout = Math.max(0, Math.floor(amount * multiplier));
    return { success: true, payout, message: pickArrayItem(INVEST_SUCCESS_MESSAGES) ?? INVEST_SUCCESS_MESSAGES[0] };
  }

  const multiplier = pickArrayItem(FAILURE_MULTIPLIERS) ?? FAILURE_MULTIPLIERS[0];
  const payout = Math.max(0, Math.floor(amount * multiplier));
  return { success: false, payout, message: pickArrayItem(INVEST_FAIL_MESSAGES) ?? INVEST_FAIL_MESSAGES[0] };
}
