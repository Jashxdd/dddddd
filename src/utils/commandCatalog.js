export function collectProCommands(catalog) {
  if (!catalog || typeof catalog.entries !== 'function') {
    return [];
  }

  const entries = [];

  for (const [categoryName, categoryMap] of catalog.entries()) {
    if (!categoryMap || typeof categoryMap.values !== 'function') {
      continue;
    }

    for (const command of categoryMap.values()) {
      if (!command?.proOnly) continue;

      entries.push({
        category: categoryName,
        description: command.description ?? 'Açıklama eklenmemiş.',
        menuGroup: command.menuGroup ?? 'Komutlar',
        slash: command.slash
          ? {
              name: command.slash.name,
              display: `/${command.slash.name}`
            }
          : null,
        prefix: command.prefix
          ? {
              name: command.prefix.name,
              display: `${command.prefix.displayPrefix ?? ''}${command.prefix.name}`
            }
          : null,
        ownerOnly: Boolean(command.ownerOnly)
      });
    }
  }

  return entries.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category, 'tr');
    }

    const aName = a.slash?.name ?? a.prefix?.name ?? 'zzz';
    const bName = b.slash?.name ?? b.prefix?.name ?? 'zzz';
    return aName.localeCompare(bName, 'tr');
  });
}
