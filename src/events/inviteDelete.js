import { Events } from 'discord.js';
import { removeInviteFromCache } from '../utils/inviteCache.js';

export default {
  name: Events.InviteDelete,
  async execute(invite) {
    if (!invite?.guild || !invite.code) return;
    removeInviteFromCache(invite.guild.id, invite.code);
  }
};
