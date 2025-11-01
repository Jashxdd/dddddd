import { getCategoryMeta } from '../data/categoryMetadata.js';

export function computeCatalogStats(categories) {
  const stats = {
    totalCommands: 0,
    slashCount: 0,
    prefixCount: 0,
    proCount: 0,
    ownerCount: 0
  };

  for (const [, commands] of categories) {
    stats.totalCommands += commands.length;

    for (const command of commands) {
      if (command.slash) stats.slashCount += 1;
      if (command.prefix) stats.prefixCount += 1;
      if (command.proOnly) stats.proCount += 1;
      if (command.ownerOnly) stats.ownerCount += 1;
    }
  }

  return stats;
}

export function collectCatalogSummary(client) {
  const categories = [];

  if (client?.commandCatalog?.entries) {
    for (const [categoryName, categoryMap] of client.commandCatalog.entries()) {
      if (!categoryMap || typeof categoryMap.values !== 'function') {
        continue;
      }

      const commands = Array.from(categoryMap.values()).filter(Boolean);
      if (!commands.length) {
        continue;
      }

      categories.push([categoryName, commands]);
    }
  }

  categories.sort(([a], [b]) => {
    const metaA = getCategoryMeta(a);
    const metaB = getCategoryMeta(b);
    if (metaA.order !== metaB.order) {
      return metaA.order - metaB.order;
    }
    return a.localeCompare(b, 'tr');
  });

  const stats = computeCatalogStats(categories);

  const [topName, topCommands] = categories
    .slice()
    .sort(([, cmdsA], [, cmdsB]) => cmdsB.length - cmdsA.length)[0] ?? [null, null];

  const topCategory = topName
    ? {
        name: topName,
        commandCount: topCommands.length,
        emoji: getCategoryMeta(topName).emoji,
        description: getCategoryMeta(topName).description
      }
    : null;

  return { categories, stats, topCategory };
}
