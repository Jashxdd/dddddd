import { buildSearchEmbed, searchGuild } from '../../commands/general/not.js';

export default {
  name: 'not',
  aliases: ['ara'],
  category: 'Genel',
  description: 'Rol, kanal veya emojileri isme göre arar.',
  menuGroup: 'Kullanıcı Sistemleri',
  async execute(message, args) {
    if (!message.guild) {
      await message.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.' });
      return;
    }

    if (!args.length) {
      await message.reply({ content: 'Lütfen aramak istediğin kelimeyi yaz.' });
      return;
    }

    const typeKeywords = new Map([
      ['rol', 'rol'],
      ['kanal', 'kanal'],
      ['emoji', 'emoji']
    ]);

    let type = 'hepsi';
    let keywordArgs = [...args];
    if (typeKeywords.has(args[0].toLowerCase())) {
      type = typeKeywords.get(args[0].toLowerCase());
      keywordArgs = args.slice(1);
    }

    const keyword = keywordArgs.join(' ');
    if (!keyword) {
      await message.reply({ content: 'Arama yapmak için bir kelime girmelisin.' });
      return;
    }

    const results = searchGuild(message.guild, keyword, type);
    const embed = buildSearchEmbed({ guild: message.guild, keyword, results });
    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
