import { buildDailyPlanEmbed, generateDailyPlan } from '../../commands/general/gunluk-plan.js';

export default {
  name: 'gunluk-plan',
  aliases: ['plan'],
  category: 'Genel',
  menuGroup: 'Kullanıcı Sistemleri',
  catalogKey: 'gunluk-plan',
  description: 'Günlük hedeflerini ve önerileri hızlıca planlar.',
  async execute(message, args) {
    const goal = args.join(' ').trim();
    const plan = generateDailyPlan({ goal });
    const embed = buildDailyPlanEmbed({ user: message.author, plan });

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
