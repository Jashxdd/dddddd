import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { getTicketConfig, updateTicketConfig } from './ticketStorage.js';
import { buildTicketPanelComponents, buildTicketPanelEmbed, recordTicketPanel } from './ticketManager.js';

const wizardStates = new Map();

const steps = [
  {
    id: 'panel',
    title: 'Panel Kanalı',
    description: 'Ticket panelinin yayınlanacağı metin kanalını seç.',
    buildComponents(state) {
      const select = new ChannelSelectMenuBuilder()
        .setCustomId('ticket-setup:panel')
        .setPlaceholder('Metin kanalı seçin')
        .setMaxValues(1)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);

      return [new ActionRowBuilder().addComponents(select)];
    },
    isComplete(data) {
      return Boolean(data.panelChannelId);
    }
  },
  {
    id: 'category',
    title: 'Ticket Kategorisi',
    description: 'Yeni ticket kanallarının taşınacağı kategori kanalını seç.',
    buildComponents(state) {
      const select = new ChannelSelectMenuBuilder()
        .setCustomId('ticket-setup:category')
        .setPlaceholder('Kategori kanalını seç')
        .setMaxValues(1)
        .addChannelTypes(ChannelType.GuildCategory);

      return [new ActionRowBuilder().addComponents(select)];
    },
    isComplete(data) {
      return Boolean(data.categoryId);
    }
  },
  {
    id: 'support',
    title: 'Destek Ekibi Rolü',
    description: 'Ticketları yönetebilecek rolü belirle. Bu rol ticket kanallarına otomatik erişim alacak.',
    buildComponents(state) {
      const select = new RoleSelectMenuBuilder()
        .setCustomId('ticket-setup:support')
        .setPlaceholder('Destek rolünü seç')
        .setMaxValues(1);

      return [new ActionRowBuilder().addComponents(select)];
    },
    isComplete(data) {
      return Boolean(data.supportRoleId);
    }
  },
  {
    id: 'logs',
    title: 'Log ve Transkript',
    description: 'Ticket açılış ve kapanış loglarının gideceği kanalı, varsa transkript kanalını belirle.',
    buildComponents(state) {
      const logSelect = new ChannelSelectMenuBuilder()
        .setCustomId('ticket-setup:log')
        .setPlaceholder('Log kanalını seç')
        .setMaxValues(1)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);

      const transcriptSelect = new ChannelSelectMenuBuilder()
        .setCustomId('ticket-setup:transcript')
        .setPlaceholder('Opsiyonel arşiv kanalı seç (isteğe bağlı)')
        .setMaxValues(1)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);

      return [new ActionRowBuilder().addComponents(logSelect), new ActionRowBuilder().addComponents(transcriptSelect)];
    },
    isComplete(data) {
      return Boolean(data.logChannelId);
    }
  },
  {
    id: 'limit',
    title: 'Ticket Limiti',
    description: 'Bir üyenin aynı anda açabileceği ticket sayısını seç.',
    buildComponents(state) {
      const select = new StringSelectMenuBuilder()
        .setCustomId('ticket-setup:limit')
        .setPlaceholder('Ticket sınırı seç')
        .addOptions(
          { label: '1 ticket', value: '1', default: state.data.ticketLimit === 1 },
          { label: '3 ticket', value: '3', default: state.data.ticketLimit === 3 },
          { label: '5 ticket', value: '5', default: state.data.ticketLimit === 5 },
          { label: '10 ticket', value: '10', default: state.data.ticketLimit === 10 }
        );

      const editButton = new ButtonBuilder()
        .setCustomId('ticket-setup:edit-template')
        .setLabel('Karşılama Mesajını Düzenle')
        .setEmoji('📝')
        .setStyle(ButtonStyle.Secondary);

      return [new ActionRowBuilder().addComponents(select), new ActionRowBuilder().addComponents(editButton)];
    },
    isComplete(data) {
      return Number.isFinite(data.ticketLimit) && data.ticketLimit > 0;
    }
  },
  {
    id: 'summary',
    title: 'Özet ve Onay',
    description: 'Seçimlerini gözden geçir ve kurulumu tamamla.',
    buildComponents() {
      return [];
    },
    isComplete() {
      return true;
    }
  }
];

function getStateKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function formatChannel(guild, channelId) {
  if (!channelId) return 'Ayarlanmadı';
  const channel = guild?.channels?.cache?.get(channelId);
  return channel ? channel.toString() : `#${channelId}`;
}

function formatRole(guild, roleId) {
  if (!roleId) return 'Ayarlanmadı';
  const role = guild?.roles?.cache?.get(roleId);
  return role ? role.toString() : `@${roleId}`;
}

function buildNavigationRow(state) {
  const step = steps[state.step];
  const canGoBack = state.step > 0;
  const isLast = state.step === steps.length - 1;
  const canAdvance = step.isComplete(state.data);

  const backButton = new ButtonBuilder()
    .setCustomId('ticket-setup:back')
    .setLabel('Geri')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(!canGoBack);

  const nextButton = new ButtonBuilder()
    .setCustomId('ticket-setup:next')
    .setLabel('İleri')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(isLast || !canAdvance);

  const cancelButton = new ButtonBuilder()
    .setCustomId('ticket-setup:cancel')
    .setLabel('İptal')
    .setStyle(ButtonStyle.Danger);

  const components = [backButton, nextButton, cancelButton];

  if (isLast) {
    components.splice(1, 1, new ButtonBuilder().setCustomId('ticket-setup:finish').setLabel('Kaydet').setStyle(ButtonStyle.Success));
  }

  return new ActionRowBuilder().addComponents(components);
}

function buildStepEmbed(state, guild) {
  const step = steps[state.step];
  const embed = new EmbedBuilder()
    .setColor(0x1abc9c)
    .setTitle('🎫 Ticket Kurulum Sihirbazı')
    .setDescription(`Adım ${state.step + 1}/${steps.length} — ${step.title}`)
    .addFields({ name: 'Açıklama', value: step.description });

  if (state.step > 0 || step.id === 'panel') {
    embed.addFields(
      { name: 'Panel Kanalı', value: formatChannel(guild, state.data.panelChannelId) },
      { name: 'Kategori', value: formatChannel(guild, state.data.categoryId) },
      { name: 'Destek Rolü', value: formatRole(guild, state.data.supportRoleId) }
    );
  }

  if (state.step >= 3) {
    embed.addFields(
      { name: 'Log Kanalı', value: formatChannel(guild, state.data.logChannelId) },
      { name: 'Transkript', value: formatChannel(guild, state.data.transcriptChannelId) }
    );
  }

  if (state.step >= 4) {
    embed.addFields({ name: 'Ticket Limiti', value: `${state.data.ticketLimit ?? 'Ayarlanmadı'}` });
  }

  if (state.step === steps.length - 1) {
    embed.addFields({ name: 'Karşılama Mesajı', value: state.data.messageTemplate || 'Varsayılan mesaj kullanılacak.' });
  }

  embed.setFooter({ text: 'Seçimlerini değiştirerek adımlar arasında ilerleyebilirsin.' }).setTimestamp();
  return embed;
}

function buildStepPayload(state, guild) {
  const step = steps[state.step];
  const embed = buildStepEmbed(state, guild);
  const components = [...step.buildComponents(state), buildNavigationRow(state)].filter(Boolean);
  return { embeds: [embed], components };
}

function getWizardState(interaction) {
  const key = getStateKey(interaction.guildId, interaction.user.id);
  const state = wizardStates.get(key);
  if (!state) {
    return null;
  }
  if (state.messageId && interaction.message && interaction.message.id !== state.messageId) {
    return null;
  }
  return state;
}

function setWizardState(state) {
  const key = getStateKey(state.guildId, state.userId);
  wizardStates.set(key, state);
}

function clearWizardState(guildId, userId) {
  wizardStates.delete(getStateKey(guildId, userId));
}

export async function startTicketSetup(interaction) {
  if (!interaction.guild) {
    await interaction.editReply({ content: 'Ticket kurulumu yalnızca sunucularda kullanılabilir.' });
    return;
  }

  const config = await getTicketConfig(interaction.guildId);
  const data = {
    panelChannelId: config?.panelChannelId ?? null,
    categoryId: config?.categoryId ?? null,
    supportRoleId: config?.supportRoleId ?? null,
    logChannelId: config?.logChannelId ?? null,
    transcriptChannelId: config?.transcriptChannelId ?? null,
    ticketLimit: Number.isFinite(config?.ticketLimit) ? config.ticketLimit : 3,
    messageTemplate: config?.messageTemplate ??
      'Merhaba {user}, talebini aldık! Yetkililer kısa süre içinde seninle ilgilenecek. Bu ticket ID: {ticketId}'
  };

  const state = {
    guildId: interaction.guildId,
    userId: interaction.user.id,
    step: 0,
    data,
    messageId: null
  };

  setWizardState(state);
  const payload = buildStepPayload(state, interaction.guild);
  const message = await interaction.editReply(payload);
  state.messageId = message.id;
  setWizardState(state);
}

function ensureState(interaction) {
  const state = getWizardState(interaction);
  if (!state) {
    return null;
  }
  if (interaction.user.id !== state.userId) {
    interaction.reply({ content: 'Bu sihirbaz başka bir kullanıcı tarafından başlatıldı.', flags: MessageFlags.Ephemeral }).catch(() => {});
    return null;
  }
  return state;
}

async function redraw(interaction, state) {
  setWizardState(state);
  const payload = buildStepPayload(state, interaction.guild);
  if (
    interaction.isButton() ||
    interaction.isStringSelectMenu?.() ||
    interaction.isRoleSelectMenu?.() ||
    interaction.isChannelSelectMenu?.()
  ) {
    await interaction.update(payload).catch(() => {});
  } else if (interaction.isModalSubmit()) {
    await interaction.editReply(payload).catch(() => {});
  }
}

export async function handleTicketSetupButton(interaction) {
  if (!interaction.customId.startsWith('ticket-setup:')) {
    return false;
  }

  const state = ensureState(interaction);
  if (!state) {
    await interaction.reply({ content: 'Kurulum oturumu bulunamadı veya başka bir kullanıcıya ait.', ephemeral: true });
    return true;
  }

  const action = interaction.customId.split(':')[1];

  if (action === 'cancel') {
    clearWizardState(state.guildId, state.userId);
    await interaction.update({ content: 'Ticket kurulumu iptal edildi.', components: [], embeds: [] }).catch(() => {});
    return true;
  }

  if (action === 'edit-template') {
    const modal = new ModalBuilder()
      .setCustomId('ticket-setup:template')
      .setTitle('Ticket Karşılama Mesajı');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('template')
          .setLabel('Karşılama Mesajı')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(400)
          .setRequired(true)
          .setValue(state.data.messageTemplate ?? '')
      )
    );

    await interaction.showModal(modal);
    return true;
  }

  if (action === 'back') {
    state.step = Math.max(0, state.step - 1);
    await redraw(interaction, state);
    return true;
  }

  if (action === 'next') {
    const current = steps[state.step];
    if (!current.isComplete(state.data)) {
      await interaction.reply({ content: 'Lütfen bu adımdaki seçimleri tamamlayın.', ephemeral: true });
      return true;
    }

    state.step = Math.min(steps.length - 1, state.step + 1);
    await redraw(interaction, state);
    return true;
  }

  if (action === 'finish') {
    const requiredSteps = steps.slice(0, steps.length - 1);
    if (requiredSteps.some((step) => !step.isComplete(state.data))) {
      await interaction.reply({ content: 'Tüm adımları tamamlamadan kaydedemezsin.', ephemeral: true });
      return true;
    }

    clearWizardState(state.guildId, state.userId);

    const updated = await updateTicketConfig(state.guildId, {
      panelChannelId: state.data.panelChannelId,
      categoryId: state.data.categoryId,
      supportRoleId: state.data.supportRoleId,
      logChannelId: state.data.logChannelId,
      transcriptChannelId: state.data.transcriptChannelId ?? null,
      ticketLimit: state.data.ticketLimit,
      messageTemplate: state.data.messageTemplate
    });

    const panelChannel = interaction.guild.channels.cache.get(updated.panelChannelId) ??
      (await interaction.guild.channels.fetch(updated.panelChannelId).catch(() => null));

    if (!panelChannel?.isTextBased()) {
      await interaction.update({
        content: 'Ayarlar kaydedildi ancak panel kanalı bulunamadı. Lütfen seçiminizi tekrar kontrol edin.',
        components: [],
        embeds: []
      });
      return true;
    }

    const embed = buildTicketPanelEmbed(updated, interaction.guild);
    const components = buildTicketPanelComponents(interaction.guildId, updated);

    let panelMessage = null;
    if (updated.panelMessageId) {
      panelMessage = await panelChannel.messages.fetch(updated.panelMessageId).catch(() => null);
    }

    if (panelMessage) {
      await panelMessage.edit({ embeds: [embed], components }).catch(() => {});
    } else {
      panelMessage = await panelChannel.send({ embeds: [embed], components }).catch(() => null);
    }

    if (panelMessage) {
      await recordTicketPanel(interaction.guildId, { channelId: panelChannel.id, messageId: panelMessage.id });
    }

    const summaryEmbed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('Ticket Kurulumu Tamamlandı')
      .setDescription('Yeni ticket paneli başarıyla güncellendi.')
      .addFields(
        { name: 'Panel Kanalı', value: formatChannel(interaction.guild, updated.panelChannelId) },
        { name: 'Kategori', value: formatChannel(interaction.guild, updated.categoryId) },
        { name: 'Destek Rolü', value: formatRole(interaction.guild, updated.supportRoleId) },
        { name: 'Log Kanalı', value: formatChannel(interaction.guild, updated.logChannelId) },
        { name: 'Ticket Limiti', value: `${updated.ticketLimit}` }
      )
      .setTimestamp();

    await interaction.update({ embeds: [summaryEmbed], components: [] }).catch(() => {});
    return true;
  }

  return false;
}

export async function handleTicketSetupChannelSelect(interaction) {
  if (!interaction.customId.startsWith('ticket-setup:')) {
    return false;
  }

  const state = ensureState(interaction);
  if (!state) {
    await interaction.reply({ content: 'Kurulum oturumu bulunamadı.', ephemeral: true });
    return true;
  }

  const action = interaction.customId.split(':')[1];
  const selected = interaction.values?.[0] ?? null;

  if (action === 'panel') {
    state.data.panelChannelId = selected;
  } else if (action === 'category') {
    state.data.categoryId = selected;
  } else if (action === 'log') {
    state.data.logChannelId = selected;
  } else if (action === 'transcript') {
    state.data.transcriptChannelId = selected;
  } else {
    return false;
  }

  await redraw(interaction, state);
  return true;
}

export async function handleTicketSetupRoleSelect(interaction) {
  if (!interaction.customId.startsWith('ticket-setup:')) {
    return false;
  }

  const state = ensureState(interaction);
  if (!state) {
    await interaction.reply({ content: 'Kurulum oturumu bulunamadı.', ephemeral: true });
    return true;
  }

  const action = interaction.customId.split(':')[1];
  if (action !== 'support') {
    return false;
  }

  state.data.supportRoleId = interaction.values?.[0] ?? null;
  await redraw(interaction, state);
  return true;
}

export async function handleTicketSetupStringSelect(interaction) {
  if (!interaction.customId.startsWith('ticket-setup:')) {
    return false;
  }

  const state = ensureState(interaction);
  if (!state) {
    await interaction.reply({ content: 'Kurulum oturumu bulunamadı.', ephemeral: true });
    return true;
  }

  const action = interaction.customId.split(':')[1];
  if (action === 'limit') {
    const value = Number.parseInt(interaction.values?.[0] ?? '0', 10);
    if (Number.isFinite(value) && value > 0) {
      state.data.ticketLimit = value;
    }
    await redraw(interaction, state);
    return true;
  }

  return false;
}

export async function handleTicketSetupModal(interaction) {
  if (interaction.customId !== 'ticket-setup:template') {
    return false;
  }

  const state = ensureState(interaction);
  if (!state) {
    await interaction.reply({ content: 'Kurulum oturumu bulunamadı.', ephemeral: true });
    return true;
  }

  const rawTemplate = interaction.fields.getTextInputValue('template') ?? '';
  const template = rawTemplate.trim().slice(0, 400) || state.data.messageTemplate;
  state.data.messageTemplate = template;

  await redraw(interaction, state);
  return true;
}
