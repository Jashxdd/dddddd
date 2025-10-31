export function collectProCommands(catalog) {
  if (!catalog || typeof catalog !== 'object') {
    return [];
  }

  const entries = [];
  const iterator = typeof catalog.entries === 'function' ? catalog.entries() : null;
  if (!iterator) {
    return entries;
  }

  for (const [category, commands] of iterator) {
    if (!Array.isArray(commands) || !commands.length) {
      continue;
    }

    for (const command of commands) {
      if (!command || !command.proOnly) {
        continue;
      }

      entries.push({
        category,
        type: command.type ?? 'slash',
        name: command.name ?? 'bilinmiyor',
        displayName: command.displayName ?? command.name ?? 'Komut',
        description: command.description ?? 'Açıklama eklenmemiş.'
      });
    }
  }

  return entries.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type.localeCompare(b.type, 'tr');
    }

    if (a.category !== b.category) {
      return a.category.localeCompare(b.category, 'tr');
    }

    return a.name.localeCompare(b.name, 'tr');
  });
}
