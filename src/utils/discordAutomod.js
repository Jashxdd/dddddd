import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType
} from 'discord.js';

const RULE_NAME = 'Genel Bot Kelime Filtresi';

function buildKeywordList(input) {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 1);
}

export function parseKeywords(input) {
  const keywords = buildKeywordList(input);
  if (!keywords.length) {
    throw new Error('En az iki karakterlik bir kelime veya ifade belirtmelisin.');
  }
  return keywords;
}

export async function upsertKeywordRule(guild, keywords, customMessage) {
  const rules = await guild.autoModerationRules.fetch().catch(() => null);
  const existing = rules?.find((rule) => rule.name === RULE_NAME) ?? null;

  const payload = {
    name: RULE_NAME,
    eventType: AutoModerationRuleEventType.MessageSend,
    triggerType: AutoModerationRuleTriggerType.Keyword,
    triggerMetadata: {
      keywordFilter: keywords
    },
    actions: [
      {
        type: AutoModerationActionType.BlockMessage,
        metadata: customMessage ? { customMessage } : {}
      }
    ],
    enabled: true
  };

  if (existing) {
    return existing.edit(payload);
  }

  return guild.autoModerationRules.create(payload);
}

export async function disableKeywordRule(guild) {
  const rules = await guild.autoModerationRules.fetch().catch(() => null);
  const existing = rules?.find((rule) => rule.name === RULE_NAME) ?? null;
  if (!existing) {
    return false;
  }

  await existing.edit({ enabled: false });
  return true;
}

export async function getKeywordRuleInfo(guild) {
  const rules = await guild.autoModerationRules.fetch().catch(() => null);
  const existing = rules?.find((rule) => rule.name === RULE_NAME) ?? null;
  if (!existing) {
    return { exists: false };
  }

  const keywords = existing.triggerMetadata?.keywordFilter ?? [];
  return {
    exists: true,
    enabled: existing.enabled,
    keywords
  };
}
