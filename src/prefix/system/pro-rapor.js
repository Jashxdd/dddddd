import { collectProCommands } from '../../utils/commandCatalog.js';
import { listProMembers, isProMember } from '../../utils/proMembership.js';

export default {
  name: 'pro-rapor',
  aliases: ['prorapor'],
  catalogKey: 'pro-rapor',
  category: 'Extra',
  description: 'Pro üyelik verilerinin kısa bir özetini gösterir.',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  async execute(message) {
    const allowed = await isProMember(message.author.id);
    if (!allowed && message.author.id !== message.client.ownerId) {
      await message.reply({
        content: '💎 Bu raporu yalnızca Pro üyeler görüntüleyebilir.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const [commands, members] = await Promise.all([
      Promise.resolve(collectProCommands(message.client.commandCatalog)),
      listProMembers()
    ]);

    const lines = [
      `💎 Pro üye sayısı: **${members.length}**`,
      `⚙️ Pro komut sayısı: **${commands.length}**`
    ];

    const latest = commands.slice(-5);
    if (latest.length) {
      lines.push('📌 Son eklenenler:');
      for (const command of latest) {
        const forms = [];
        if (command.slash) forms.push(`/${command.slash.name}`);
        if (command.prefix) forms.push(command.prefix.display);
        lines.push(`• ${forms.join(' • ') || 'Komut'} (${command.category})`);
      }
    }

    await message.reply({
      content: lines.join('\n'),
      allowedMentions: { repliedUser: false }
    });
  }
};
