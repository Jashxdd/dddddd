import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import {
  focusSuggestions,
  healthBreakSuggestions,
  motivationalQuotes,
  projectMilestones
} from '../../data/contentLibrary.js';
import { pickRandom, pickRandomItems } from '../../utils/random.js';

export function generateDailyPlan({ goal } = {}) {
  const focus = pickRandom(focusSuggestions);
  const breakTip = pickRandom(healthBreakSuggestions);
  const quote = pickRandom(motivationalQuotes);
  const milestones = pickRandomItems(projectMilestones, 3);

  return {
    focus,
    breakTip,
    quote,
    milestones,
    goal: goal?.trim() ? goal.trim() : null
  };
}

export function buildDailyPlanEmbed({ user, plan }) {
  const embed = new EmbedBuilder()
    .setColor(0x1abc9c)
    .setTitle('🗓️ Günlük Plan Asistanı')
    .setDescription('Günün için odak noktalarını ve kısa bir motivasyon notunu hazırladım.')
    .setFooter({ text: `${user.username} için öneriler`, iconURL: user.displayAvatarURL?.({ size: 128 }) })
    .setTimestamp();

  if (plan.goal) {
    embed.addFields({ name: '🎯 Günün hedefi', value: plan.goal });
  }

  if (plan.focus) {
    embed.addFields({ name: '🧭 Odak önerisi', value: plan.focus });
  }

  if (plan.milestones?.length) {
    embed.addFields({ name: '🪜 Adım adım ilerle', value: plan.milestones.map((item) => `• ${item}`).join('\n') });
  }

  if (plan.breakTip) {
    embed.addFields({ name: '☕ Mola hatırlatıcısı', value: plan.breakTip });
  }

  if (plan.quote) {
    embed.addFields({ name: '💬 İlham köşesi', value: plan.quote });
  }

  return embed;
}

export default {
  category: 'Genel',
  menuGroup: 'Kullanıcı Sistemleri',
  catalogKey: 'gunluk-plan',
  data: new SlashCommandBuilder()
    .setName('gunluk-plan')
    .setDescription('Günlük hedeflerini planlamak için kişisel bir özet oluşturur.')
    .addStringOption((option) =>
      option
        .setName('hedef')
        .setDescription('Bugün odaklanmak istediğin hedefi yaz.')
        .setMaxLength(120)
    ),
  async execute(interaction) {
    const goal = interaction.options.getString('hedef') ?? undefined;
    const plan = generateDailyPlan({ goal });
    const embed = buildDailyPlanEmbed({ user: interaction.user, plan });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
