import { EmbedBuilder } from 'discord.js';
import { addInventoryItem, canUseAction, incrementStat, modifyBalance, recordActionUsage } from '../../utils/economyStorage.js';
import { applyBonus, getEconomyConfig } from '../../utils/economyConfigStorage.js';
import { recordEconomyEvent } from '../../utils/economyLedgerStorage.js';
import { logEconomyChange } from '../../utils/economyLog.js';
import { isEconomyBlacklisted } from '../../utils/blacklistStorage.js';
import { pickRandom, randomInt } from '../../utils/random.js';

const HUNT_COOLDOWN = 12 * 60 * 1000;
const MINE_COOLDOWN = 18 * 60 * 1000;
const HEIST_COOLDOWN = 30 * 60 * 1000;

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} sa ${remainingMinutes} dk`;
  }
  if (minutes > 0) {
    return `${minutes} dk ${seconds} sn`;
  }
  return `${seconds} sn`;
}

function formatCurrency(amount, economyConfig) {
  const safeAmount = Math.max(0, Math.floor(Number.isFinite(amount) ? amount : 0));
  return `${safeAmount.toLocaleString('tr-TR')} ${economyConfig.currencySymbol ?? '💰'}`;
}

async function ensureEconomyAllowed(message) {
  if (await isEconomyBlacklisted(message.author.id)) {
    await message.reply({
      content: '⛔ Ekonomi sisteminden sınırlandırıldığın için bu komutu kullanamazsın.',
      allowedMentions: { repliedUser: false }
    });
    return false;
  }
  return true;
}

async function runRewardCommand(message, definition) {
  if (!(await ensureEconomyAllowed(message))) return;

  const cooldown = await canUseAction(message.author.id, definition.cooldownKey, definition.cooldownMs);
  if (!cooldown.available) {
    await message.reply({
      content: `⏳ Bu ekonomi etkinliğini tekrar kullanmak için **${formatDuration(cooldown.remaining)}** beklemelisin.`,
      allowedMentions: { repliedUser: false }
    });
    return;
  }

  const economyConfig = await getEconomyConfig(message.guild.id);
  const scenario = definition.resolveScenario();
  const baseReward = randomInt(scenario.reward[0], scenario.reward[1]);
  const reward = applyBonus(baseReward, economyConfig.bonusMultiplier);
  const nextBalance = await modifyBalance(message.author.id, reward);
  await recordActionUsage(message.author.id, definition.cooldownKey);
  await incrementStat(message.author.id, definition.statKey, 1);

  let itemLine = null;
  if (scenario.itemId && Math.random() <= scenario.itemChance) {
    const inventory = await addInventoryItem(message.author.id, scenario.itemId, 1);
    itemLine = `${scenario.itemName} envanterine eklendi. Toplam: **${inventory.total}**`;
  }

  const embed = new EmbedBuilder()
    .setColor(definition.color)
    .setTitle(definition.title)
    .setDescription(scenario.text)
    .addFields(
      { name: 'Kazanç', value: formatCurrency(reward, economyConfig), inline: true },
      { name: 'Yeni Bakiye', value: formatCurrency(nextBalance, economyConfig), inline: true },
      { name: 'Bonus Oranı', value: `x${economyConfig.bonusMultiplier}`, inline: true }
    )
    .setFooter({ text: 'Furmin yeni nesil ekonomi sistemi' })
    .setTimestamp();

  if (itemLine) {
    embed.addFields({ name: 'Ek Ganimet', value: itemLine, inline: false });
  }

  await recordEconomyEvent({
    userId: message.author.id,
    guildId: message.guild.id,
    executorId: message.author.id,
    type: definition.ledgerType,
    amount: reward,
    balanceAfter: nextBalance,
    note: scenario.logNote
  });

  await logEconomyChange(message.client, message.guild.id, {
    userId: message.author.id,
    executorId: message.author.id,
    type: definition.logType,
    amount: reward,
    balanceAfter: nextBalance,
    title: definition.logTitle,
    note: scenario.logNote
  });

  await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
}

const huntScenarios = [
  {
    text: '🌲 Ormanda iz sürdün ve parlayan bir ganimet sandığı buldun.',
    reward: [120, 360],
    itemId: 'minik-dost',
    itemName: 'Minik Dost',
    itemChance: 0.12,
    logNote: 'Avlanma etkinliği başarıyla tamamlandı.'
  },
  {
    text: '🦊 Hızlı bir tilkiyi takip ettin; izler seni küçük bir ödüle götürdü.',
    reward: [90, 260],
    itemId: 'enerji-icecegi',
    itemName: 'Enerji İçeceği',
    itemChance: 0.18,
    logNote: 'Avlanma etkinliğinde bonus eşya şansı denendi.'
  },
  {
    text: '🧭 Hazine haritasındaki ipucunu çözdün ve güvenli şekilde geri döndün.',
    reward: [180, 420],
    itemId: 'hazine-haritasi',
    itemName: 'Hazine Haritası',
    itemChance: 0.08,
    logNote: 'Avlanma etkinliği yüksek ödülle tamamlandı.'
  }
];

const mineScenarios = [
  {
    text: '⛏️ Madende kristal damarına denk geldin ve kazancını kasaya aktardın.',
    reward: [160, 440],
    itemId: 'kristal-kup',
    itemName: 'Kristal Kupa',
    itemChance: 0.1,
    logNote: 'Madencilik kazancı işlendi.'
  },
  {
    text: '💎 Derin tünelde nadir taşlar buldun; ekipmanını da sağlam çıkardın.',
    reward: [220, 520],
    itemId: 'koleksiyon-rozeti',
    itemName: 'Koleksiyon Rozeti',
    itemChance: 0.07,
    logNote: 'Madencilik nadir ganimet denemesi tamamlandı.'
  },
  {
    text: '🪨 Kayaları temizlerken küçük ama istikrarlı bir gelir elde ettin.',
    reward: [110, 310],
    itemId: 'enerji-icecegi',
    itemName: 'Enerji İçeceği',
    itemChance: 0.16,
    logNote: 'Madencilik standart kazanç verdi.'
  }
];

const heistScenarios = [
  {
    text: '🕵️ Planlı bir kasa denemesi yaptın ve alarmı tetiklemeden ödülü aldın.',
    reward: [260, 680],
    itemId: 'vip-bilet',
    itemName: 'VIP Bilet',
    itemChance: 0.05,
    logNote: 'Riskli kasa denemesi başarıyla sonuçlandı.'
  },
  {
    text: '🎭 Dikkat dağıtma planın işe yaradı; ekip payını kasana ekledi.',
    reward: [220, 560],
    itemId: 'iletisim-kiti',
    itemName: 'İletişim Kiti',
    itemChance: 0.1,
    logNote: 'Riskli ekonomi etkinliği tamamlandı.'
  },
  {
    text: '🚨 Güvenlik neredeyse seni fark ediyordu ama son anda küçük bir kazançla çıktın.',
    reward: [80, 260],
    itemId: 'enerji-icecegi',
    itemName: 'Enerji İçeceği',
    itemChance: 0.14,
    logNote: 'Riskli kasa denemesi düşük ödülle tamamlandı.'
  }
];

export default [
  {
    name: 'avlan',
    aliases: ['av', 'hunt'],
    category: 'Ekonomi',
    menuGroup: 'Yeni Nesil Ekonomi',
    description: 'OwO tarzı hızlı avlanma etkinliğiyle FurCoin ve eşya kazanma şansı verir.',
    featureToggle: 'economy',
    async execute(message) {
      await runRewardCommand(message, {
        title: '🏹 Avlanma Seferi',
        color: 0x2ecc71,
        cooldownKey: 'hunt',
        cooldownMs: HUNT_COOLDOWN,
        statKey: 'adventure',
        ledgerType: 'hunt',
        logType: 'Avlanma',
        logTitle: '🏹 Ekonomi Avlanma Kaydı',
        resolveScenario: () => pickRandom(huntScenarios)
      });
    }
  },
  {
    name: 'maden',
    aliases: ['madencilik', 'mine'],
    category: 'Ekonomi',
    menuGroup: 'Yeni Nesil Ekonomi',
    description: 'Madencilik yaparak FurCoin ve nadir koleksiyon eşyası kazanmayı dener.',
    featureToggle: 'economy',
    async execute(message) {
      await runRewardCommand(message, {
        title: '⛏️ Madencilik Vardiyası',
        color: 0xf1c40f,
        cooldownKey: 'mine',
        cooldownMs: MINE_COOLDOWN,
        statKey: 'work',
        ledgerType: 'mine',
        logType: 'Madencilik',
        logTitle: '⛏️ Ekonomi Madencilik Kaydı',
        resolveScenario: () => pickRandom(mineScenarios)
      });
    }
  },
  {
    name: 'soygun',
    aliases: ['kasa-soygunu', 'heist'],
    category: 'Ekonomi',
    menuGroup: 'Yeni Nesil Ekonomi',
    description: 'Riskli kasa denemesiyle yüksek FurCoin ödülü ve düşük ihtimalli eşya şansı sunar.',
    featureToggle: 'economy',
    async execute(message) {
      await runRewardCommand(message, {
        title: '🕵️ Kasa Operasyonu',
        color: 0xe67e22,
        cooldownKey: 'heist',
        cooldownMs: HEIST_COOLDOWN,
        statKey: 'adventure',
        ledgerType: 'heist',
        logType: 'Kasa Operasyonu',
        logTitle: '🕵️ Ekonomi Kasa Operasyonu',
        resolveScenario: () => pickRandom(heistScenarios)
      });
    }
  }
];
