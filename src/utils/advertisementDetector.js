const DISCORD_INVITE_PATTERN = /(?:discord\.gg|discord(?:app)?\.com\/invite|discord\.me|discord\.io|discord\.link)\/[^\s]+/i;
const GENERIC_URL_PATTERN = /https?:\/\/[^\s]+/gi;

function sanitise(content) {
  return content.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

export function detectAdvertisement(content) {
  if (!content) return null;
  const text = sanitise(content);

  const inviteMatch = text.match(DISCORD_INVITE_PATTERN);
  if (inviteMatch) {
    return { type: 'discord-invite', snippet: inviteMatch[0] };
  }

  const urlMatch = text.match(GENERIC_URL_PATTERN);
  if (urlMatch) {
    const firstUrl = urlMatch[0];
    if (/\b(join|kat[ıi]l|sunucu|server|discord)\b/i.test(text)) {
      return { type: 'suspicious-url', snippet: firstUrl };
    }
  }

  return null;
}

export function formatAdvertisementReason(match) {
  if (!match) return 'Şüpheli bağlantı tespit edildi.';
  if (match.type === 'discord-invite') {
    return `Discord davet bağlantısı: ${match.snippet}`;
  }
  if (match.type === 'suspicious-url') {
    return `Olası reklam bağlantısı: ${match.snippet}`;
  }
  return 'Şüpheli bağlantı tespit edildi.';
}
