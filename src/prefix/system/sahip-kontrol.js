import { collectProCommands } from '../../utils/commandCatalog.js';

export default {
  name: 'sahip-kontrol',
  aliases: ['kontrolpanel'],
  catalogKey: 'sahip-kontrol',
  category: 'Sistem',
  description: 'Furmin sahibine özel hızlı kontrol paneli.',
  menuGroup: 'Sahip Araçları',
  ownerOnly: true,
  async execute(message) {
    if (message.author.id !== message.client.ownerId) {
      await message.reply({
        content: '⭐ Bu komutu yalnızca Furmin sahibi kullanabilir.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const guilds = await message.client.guilds.fetch();
    const proCommands = collectProCommands(message.client.commandCatalog);
    const lines = [
      `👑 Toplam sunucu: **${guilds.size}**`,
      `⚡ Slash komutları: **${message.client.commands.size}**`,
      `💎 Pro komutları: **${proCommands.length}**`
    ];

    const preview = [];
    for (const guild of guilds.values()) {
      const cached = message.client.guilds.cache.get(guild.id);
      preview.push(`• ${guild.name} (${guild.id}) — Üye: ${cached?.memberCount ?? '—'}`);
      if (preview.length === 8) break;
    }

    if (preview.length) {
      lines.push('📋 Sunucu listesi:');
      lines.push(...preview);
    }

    await message.reply({
      content: lines.join('\n'),
      allowedMentions: { repliedUser: false }
    });
  }
};
