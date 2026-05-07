const inviteCache = new Map();

function ensureGuildMap(guildId) {
  if (!guildId) return new Map();
  if (!inviteCache.has(guildId)) {
    inviteCache.set(guildId, new Map());
  }
  return inviteCache.get(guildId);
}

export function snapshotInvites(guildId, invites) {
  if (!guildId) return;
  const target = ensureGuildMap(guildId);
  target.clear();
  if (!invites) return;
  invites.forEach((invite) => {
    if (!invite?.code) return;
    const uses = typeof invite.uses === 'number' ? invite.uses : 0;
    target.set(invite.code, uses);
  });
}

export function detectUsedInvite(guildId, invites) {
  if (!guildId || !invites) return null;
  const previous = new Map(ensureGuildMap(guildId));
  const next = new Map();
  let detected = null;

  invites.forEach((invite) => {
    if (!invite?.code) return;
    const uses = typeof invite.uses === 'number' ? invite.uses : 0;
    const prevUses = previous.get(invite.code) ?? 0;
    next.set(invite.code, uses);
    if (!detected && uses > prevUses) {
      detected = {
        code: invite.code,
        invite,
        previousUses: prevUses,
        currentUses: uses
      };
    }
  });

  inviteCache.set(guildId, next);
  return detected;
}

export function setInviteUsage(guildId, code, uses) {
  if (!guildId || !code) return;
  const target = ensureGuildMap(guildId);
  target.set(code, typeof uses === 'number' && uses > 0 ? uses : 0);
}

export function removeInviteFromCache(guildId, code) {
  if (!guildId || !code) return;
  const target = inviteCache.get(guildId);
  if (!target) return;
  target.delete(code);
}

export function clearInviteCache(guildId) {
  if (!guildId) return;
  inviteCache.delete(guildId);
}

export function getInviteCacheSnapshot(guildId) {
  if (!guildId) return new Map();
  const target = inviteCache.get(guildId);
  return new Map(target ?? []);
}
