import { EmbedBuilder } from 'discord.js';
import { pickRandomItems } from './random.js';

function buildLines(definition) {
  const bullets = Array.isArray(definition.bullets) ? definition.bullets.filter(Boolean) : [];
  if (!bullets.length) {
    return [];
  }

  if (definition.randomCount && Number.isInteger(definition.randomCount) && definition.randomCount > 0) {
    return pickRandomItems(bullets, Math.min(definition.randomCount, bullets.length));
  }

  return bullets;
}

export function createSimplePrefixCommands(definitions, defaults = {}) {
  if (!Array.isArray(definitions)) {
    return [];
  }

  return definitions
    .map((definition) => {
      if (!definition || typeof definition !== 'object') {
        return null;
      }

      const name = String(definition.name ?? '').trim();
      if (!name) {
        return null;
      }

      const catalogKey = String(definition.catalogKey ?? name).trim();
      const category = definition.category ?? defaults.category ?? 'Genel';
      const menuGroup = definition.menuGroup ?? defaults.menuGroup ?? 'Prefix Komutları';
      const description = definition.description ?? defaults.description ?? 'Bilgilendirici kısa özet.';
      const fieldName = definition.fieldName ?? defaults.fieldName ?? 'Öneriler';
      const color = definition.color ?? defaults.color ?? 0x5865f2;
      const proOnly = definition.proOnly ?? defaults.proOnly ?? false;
      const ownerOnly = definition.ownerOnly ?? defaults.ownerOnly ?? false;
      const featureToggle = definition.featureToggle ?? defaults.featureToggle;

      return {
        name,
        aliases: Array.isArray(definition.aliases) ? definition.aliases : [],
        catalogKey,
        category,
        menuGroup,
        description,
        featureToggle,
        proOnly,
        ownerOnly,
        displayPrefix: definition.displayPrefix ?? defaults.displayPrefix,
        async execute(message) {
          const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(definition.title ?? defaults.title ?? 'Furmin Bilgi Kartı')
            .setDescription(definition.intro ?? definition.descriptionText ?? definition.description ?? defaults.descriptionText ?? description)
            .setTimestamp();

          if (definition.thumbnail ?? defaults.thumbnail) {
            embed.setThumbnail(definition.thumbnail ?? defaults.thumbnail);
          }

          if (Array.isArray(definition.fields) && definition.fields.length > 0) {
            for (const field of definition.fields) {
              if (!field?.name || !field?.value) continue;
              embed.addFields({
                name: field.name,
                value: field.value
              });
            }
          } else {
            const lines = buildLines(definition);
            if (lines.length) {
              embed.addFields({
                name: fieldName,
                value: lines.join('\n')
              });
            }
          }

          if (definition.footer ?? defaults.footer) {
            embed.setFooter({ text: definition.footer ?? defaults.footer });
          }

          await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        }
      };
    })
    .filter(Boolean);
}
