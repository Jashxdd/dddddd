import { SlashCommandBuilder, PermissionFlagsBits, time } from 'discord.js';
import { formatUserMention, sendModerationLog } from '../../utils/modLog.js';

const durationChoices = [
  { label: '5 dakika', value: 5 * 60 * 1000 },
  { label: '10 dakika', value: 10 * 60 * 1000 },
  { label: '1 saat', value: 60 * 60 * 1000 },
  { label: '6 saat', value: 6 * 60 * 60 * 1000 },
  { label: '12 saat', value: 12 * 60 * 60 * 1000 },
  { label: '1 gun', value: 24 * 60 * 60 * 1000 },
  { label: '3 gun', value: 3 * 24 * 60 * 60 * 1000 },
  { label: '1 hafta', value: 7 * 24 * 60 * 60 * 1000 }
];

export default {
  category: 'Moderasyon',
  data: new SlashCommandBuilder()
    .setName('sustur')
    .setDescription('Bir kullaniciyi belirli bir sure icin zaman asimina sokar (timeout).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName('kullanici')
        .setDescription('Zaman asimina sokulacak kullanici')
        .setRequired(true)
    )
    .addStringOption((option) => {
      let builder = option
        .setName('sure')
        .setDescription('Uygulanacak sure')
        .setRequired(true);

      for (const choice of durationChoices) {
        builder = builder.addChoices({ name: choice.label, value: String(choice.value) });
      }

      return builder;
    })
    .addStringOption((option) =>
      option
        .setName('sebep')
        .setDescription('Opsiyonel sebep mesajı')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'Bu komut sadece sunucu icinde kullanilabilir.',
        ephemeral: true
      });
      return;
    }

    const target = interaction.options.getMember('kullanici');
    if (!target) {
      await interaction.reply({ content: 'Belirtilen kullanici sunucuda bulunamadi.', ephemeral: true });
      return;
    }

    if (target.id === interaction.user.id) {
      await interaction.reply({ content: 'Kendini susturamazsin.', ephemeral: true });
      return;
    }

    if (target.user.bot) {
      await interaction.reply({ content: 'Botlari susturamazsin.', ephemeral: true });
      return;
    }

    if (!target.moderatable || target.roles.highest.comparePositionTo(interaction.member.roles.highest) >= 0) {
      await interaction.reply({ content: 'Bu kullaniciya zaman asimi uygulanamiyor.', ephemeral: true });
      return;
    }

    const durationMs = Number(interaction.options.getString('sure'));
    const durationLabel =
      durationChoices.find((choice) => choice.value === durationMs)?.label ??
      `${Math.round(durationMs / 1000)} saniye`;
    const reason = interaction.options.getString('sebep') ?? 'Sebep belirtilmedi';

    await target.timeout(durationMs, reason);

    const until = time(Math.floor((Date.now() + durationMs) / 1000));

    await interaction.reply({
      content: `🔇 ${target.user.tag} kullanicisi ${reason} nedeniyle ${until} tarihine kadar susturuldu.`,
      ephemeral: true
    });

    await sendModerationLog(interaction.client, interaction.guildId, {
      action: 'Zaman Asimi',
      target: formatUserMention(target.user),
      moderator: formatUserMention(interaction.user),
      reason,
      color: 0xf1c40f,
      extraFields: [
        { name: 'Sure', value: durationLabel, inline: true },
        { name: 'Bitis', value: until, inline: true }
      ]
    });
  }
};
