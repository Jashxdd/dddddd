export function pickRandom(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return undefined;
  }

  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

export function pickRandomItems(list, count) {
  if (!Array.isArray(list) || list.length === 0 || count <= 0) {
    return [];
  }

  const copy = [...list];
  const selection = [];

  while (copy.length && selection.length < count) {
    const index = Math.floor(Math.random() * copy.length);
    selection.push(copy.splice(index, 1)[0]);
  }

  return selection;
}

export function randomInt(min, max) {
  const safeMin = Number.isFinite(min) ? Math.floor(min) : 0;
  const safeMax = Number.isFinite(max) ? Math.floor(max) : safeMin;

  if (safeMax < safeMin) {
    throw new RangeError('randomInt requires max to be greater than or equal to min');
  }

  if (safeMax === safeMin) {
    return safeMin;
  }

  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}
