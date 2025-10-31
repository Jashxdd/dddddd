import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export function searchGuild(guild, keyword, type) {
  if (!guild) return [];
  const lower = keyword.toLowerCase();
  switch (type) {
    case 'rol':
      return guild.roles.cache.filter((role) => role.name.toLowerCase().includes(lower)).map((role) => ({ type: 'Rol', value: role.toString(), id: role.id }));
    case 'kanal':
      return guild.channels.cache
        .filter((channel) => channel.name.toLowerCase().includes(lower))
        .map((channel) => ({ type: 'Kanal', value: `<#${channel.id}>`, id: channel.id }));
    case 'emoji':
      return guild.emojis.cache
        .filter((emoji) => emoji.name?.toLowerCase().includes(lower))
        .map((emoji) => ({ type: 'Emoji', value: `${emoji} :${emoji.name}:`, id: emoji.id }));
    default:
      return [
        ...searchGuild(guild, keyword, 'rol'),
        ...searchGuild(guild, keyword, 'kanal'),
        ...searchGuild(guild, keyword, 'emoji')
      ];
  }
}

export function buildSearchEmbed({ guild, keyword, results }) {
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('Nesne Arama Sonucu')
    .setDescription(`Aranan terim: **${keyword}**`)
    .setFooter({ text: guild?.name ?? 'Marpel Sistemleri' })
    .setTimestamp();

  if (!results.length) {
    embed.addFields({ name: 'Sonuç Bulunamadı', value: 'Aradığın terime uygun rol, kanal veya emoji bulunamadı.' });
    return embed;
  }

  const lines = results.slice(0, 10).map((result) => `${result.type} • ${result.value} (\`${result.id}\`)`);
  embed.addFields({ name: `Bulunan (${results.length})`, value: lines.join('\n') });

  if (results.length > 10) {
    embed.setFooter({ text: `${guild?.name ?? 'Sunucu'} • İlk 10 sonuç listelendi.` });
  }

  return embed;
}

export default {
  category: 'Genel',
  menuGroup: 'Kullanıcı Sistemleri',
  data: new SlashCommandBuilder()
    .setName('not')
    .setDescription('Rol, kanal veya emojilerde hızlı arama yapar.')
    .addStringOption((option) => option.setName('anahtar').setDescription('Arama kelimesi').setRequired(true))
    .addStringOption((option) =>
      option
        .setName('tur')
        .setDescription('Arama yapılacak nesne türü')
        .addChoices(
          { name: 'Rol', value: 'rol' },
          { name: 'Kanal', value: 'kanal' },
          { name: 'Emoji', value: 'emoji' }
        )
    ),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'Bu komut sadece sunucu içinde kullanılabilir.', ephemeral: true });
      return;
    }

    const keyword = interaction.options.getString('anahtar', true);
    const type = interaction.options.getString('tur') ?? 'hepsi';
    const results = searchGuild(interaction.guild, keyword, type);
    const embed = buildSearchEmbed({ guild: interaction.guild, keyword, results });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
