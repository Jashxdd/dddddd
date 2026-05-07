import { config, featureToggleDefaults } from '../config.js';

const CATEGORY_TOGGLE_MAP = new Map(
  [
    ['genel', 'general'],
    ['yardım', 'general'],
    ['yardim', 'general'],
    ['eğlence', 'fun'],
    ['eglence', 'fun'],
    ['moderasyon', 'moderation'],
    ['sistem', 'system'],
    ['ekonomi', 'economy'],
    ['log', 'logs'],
    ['kayıt', 'logs'],
    ['kayit', 'logs'],
    ['guard', 'guard'],
    ['koruma', 'guard']
  ].map(([key, value]) => [key, value])
);

const FEATURE_LABELS = {
  general: { label: 'Genel Sistemler', emoji: '🧭' },
  fun: { label: 'Eğlence', emoji: '🎉' },
  moderation: { label: 'Moderasyon', emoji: '🛡️' },
  economy: { label: 'Ekonomi', emoji: '💰' },
  logs: { label: 'Log & Kayıt', emoji: '📝' },
  guard: { label: 'Guard Koruması', emoji: '🛑' },
  system: { label: 'Sistem Araçları', emoji: '⚙️' }
};

function normaliseFeatureKey(key) {
  if (!key) return '';
  return String(key).trim().toLowerCase();
}

function resolveFeatureToggles() {
  return { ...featureToggleDefaults, ...(config.featureToggles ?? {}) };
}

export function isFeatureEnabled(featureKey) {
  const key = normaliseFeatureKey(featureKey);
  if (!key) return true;
  const toggles = resolveFeatureToggles();
  const value = toggles[key];
  return value !== false;
}

export function getFeatureToggleKey(command) {
  if (!command || typeof command !== 'object') {
    return '';
  }

  if (command.featureToggle) {
    return normaliseFeatureKey(command.featureToggle);
  }

  const category = normaliseFeatureKey(command.category);
  if (CATEGORY_TOGGLE_MAP.has(category)) {
    return CATEGORY_TOGGLE_MAP.get(category);
  }

  return '';
}

export function isCommandFeatureEnabled(command) {
  const featureKey = getFeatureToggleKey(command);
  return isFeatureEnabled(featureKey);
}

export function getFeatureToggleSummaries() {
  const toggles = resolveFeatureToggles();
  return Object.entries(FEATURE_LABELS).map(([key, meta]) => ({
    key,
    label: meta.label,
    emoji: meta.emoji,
    enabled: toggles[key] !== false
  }));
}

export function formatFeatureSummaryLines() {
  return getFeatureToggleSummaries().map((item) =>
    `${item.emoji} ${item.label}: ${item.enabled ? 'Açık' : 'Kapalı'}`
  );
}
