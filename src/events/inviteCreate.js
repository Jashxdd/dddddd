import { Events } from 'discord.js';
import { setInviteUsage } from '../utils/inviteCache.js';

export default {
  name: Events.InviteCreate,
  async execute(invite) {
    if (!invite?.guild || !invite.code) return;
    const uses = typeof invite.uses === 'number' ? invite.uses : 0;
    setInviteUsage(invite.guild.id, invite.code, uses);
  }
};
