const DEFAULT_LIMIT = 1024;

function sanitizeLine(line, limit) {
  if (!line) {
    return '';
  }

  const text = String(line);
  const maxLength = limit > 0 ? limit : DEFAULT_LIMIT;
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

export function splitLinesIntoFieldChunks(lines, limit = DEFAULT_LIMIT) {
  const max = limit > 0 ? limit : DEFAULT_LIMIT;
  const source = Array.isArray(lines) ? lines : [];
  const chunks = [];
  let current = '';

  for (const rawLine of source) {
    const line = sanitizeLine(rawLine, max);
    if (!line.length) continue;

    if (!current.length) {
      current = line;
      continue;
    }

    if (current.length + 1 + line.length > max) {
      chunks.push(current);
      current = line;
    } else {
      current = `${current}\n${line}`;
    }
  }

  if (current.length) {
    chunks.push(current);
  }

  if (!chunks.length) {
    chunks.push('Komut bulunamadı.');
  }

  return chunks;
}
