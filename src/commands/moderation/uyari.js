import { SlashCommandBuilder, PermissionFlagsBits, time } from 'discord.js';
import { addWarning, clearWarnings, listWarnings, removeWarning } from '../../utils/warnStorage.js';

export default {
  category: 'Moderasyon',
  data: new SlashCommandBuilder()
    .setName('uyari')
    .setDescription('Uyari sistemini yonetir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('ekle')
        .setDescription('Bir kullaniciya uyari ekler.')
        .addUserOption((option) =>
          option.setName('kullanici').setDescription('Uyarilacak kullanici').setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('sebep').setDescription('Uyarinin sebebi').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('liste')
        .setDescription('Bir kullanicinin uyarilarini listeler.')
        .addUserOption((option) =>
          option
            .setName('kullanici')
            .setDescription('Uyarilari goruntulenecek kullanici (varsayilan: kendin)')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('sil')
        .setDescription('Belirli bir uyariyi kaldirir.')
        .addUserOption((option) =>
          option.setName('kullanici').setDescription('Uyarisi silinecek kullanici').setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName('numara')
            .setDescription('Silinecek uyarinin numarasi (1, 2, 3, ...)')
            .setMinValue(1)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('temizle')
        .setDescription('Bir kullanicinin tum uyarilarini siler.')
        .addUserOption((option) =>
          option.setName('kullanici').setDescription('Uyarilari temizlenecek kullanici').setRequired(true)
        )
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut sadece sunucularda kullanilabilir.', ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'ekle') {
      const member = interaction.options.getMember('kullanici');
      if (!member) {
        await interaction.reply({ content: 'Kullanici bulunamadi.', ephemeral: true });
        return;
      }

      if (member.user.bot) {
        await interaction.reply({ content: 'Botlari uyaramazsin.', ephemeral: true });
        return;
      }

      const reason = interaction.options.getString('sebep', true);

      await addWarning(interaction.guildId, member.id, interaction.user.id, reason);

      await interaction.reply({
        content: `⚠️ ${member} kullanicisina uyari eklendi. Sebep: ${reason}`,
        ephemeral: true
      });
      return;
    }

    if (sub === 'liste') {
      const user = interaction.options.getUser('kullanici') ?? interaction.user;
      const warnings = await listWarnings(interaction.guildId, user.id);

      if (!warnings.length) {
        await interaction.reply({ content: `${user} icin kayitli uyari bulunmuyor.`, ephemeral: true });
        return;
      }

      const lines = warnings.map((warning, index) => {
        const timestamp = time(Math.floor(new Date(warning.createdAt).getTime() / 1000));
        return `**${index + 1}.** ${warning.reason} — Yetkili: <@${warning.moderatorId}> (${timestamp})`;
      });

      await interaction.reply({
        content: `📋 ${user} icin ${warnings.length} uyari bulundu:\n${lines.join('\n')}`,
        ephemeral: true
      });
      return;
    }

    if (sub === 'sil') {
      const member = interaction.options.getUser('kullanici', true);
      const number = interaction.options.getInteger('numara', true);
      const removed = await removeWarning(interaction.guildId, member.id, number - 1);

      await interaction.reply({
        content: removed
          ? `🗑️ ${member} icin ${number}. uyari silindi.`
          : '⚠️ Belirtilen numarada bir uyari bulunamadi.',
        ephemeral: true
      });
      return;
    }

    if (sub === 'temizle') {
      const member = interaction.options.getUser('kullanici', true);
      const cleared = await clearWarnings(interaction.guildId, member.id);

      await interaction.reply({
        content: cleared
          ? `🧹 ${member} icin tum uyarilar temizlendi.`
          : 'ℹ️ Bu kullanicinin zaten kayitli uyarisi bulunmuyor.',
        ephemeral: true
      });
    }
  }
};
