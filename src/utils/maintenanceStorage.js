import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'maintenance.json');

let state = { enabled: false, message: null, updatedBy: null, updatedAt: null };
let loaded = false;
let pendingWrite = null;

async function ensureLoaded() {
  if (loaded) return;

  if (!existsSync(storagePath)) {
    state = { enabled: false, message: null, updatedBy: null, updatedAt: null };
    loaded = true;
    return;
  }

  try {
    const raw = await readFile(storagePath, 'utf8');
    const parsed = JSON.parse(raw.toString());
    state = {
      enabled: Boolean(parsed?.enabled),
      message: typeof parsed?.message === 'string' ? parsed.message : null,
      updatedBy: typeof parsed?.updatedBy === 'string' ? parsed.updatedBy : null,
      updatedAt: typeof parsed?.updatedAt === 'string' ? parsed.updatedAt : null
    };
  } catch (error) {
    console.warn('Bakım modu verileri okunurken hata oluştu. Varsayılan değerler kullanılacak.', error);
    state = { enabled: false, message: null, updatedBy: null, updatedAt: null };
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(state, null, 2);
  pendingWrite = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Bakım modu verileri kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      pendingWrite = null;
    });

  await pendingWrite;
}

function sanitiseMessage(message) {
  if (!message) return null;
  const text = String(message).trim();
  if (!text.length) return null;
  return text.slice(0, 200);
}

export async function getMaintenanceState() {
  await ensureLoaded();
  return { ...state };
}

export async function isMaintenanceEnabled() {
  await ensureLoaded();
  return Boolean(state.enabled);
}

export async function enableMaintenance({ message, updatedBy } = {}) {
  await ensureLoaded();
  state = {
    enabled: true,
    message: sanitiseMessage(message),
    updatedBy: updatedBy ? String(updatedBy) : null,
    updatedAt: new Date().toISOString()
  };
  await persist();
  return { ...state };
}

export async function disableMaintenance({ updatedBy } = {}) {
  await ensureLoaded();
  const previous = { ...state };
  state = {
    enabled: false,
    message: null,
    updatedBy: updatedBy ? String(updatedBy) : state.updatedBy,
    updatedAt: new Date().toISOString()
  };
  await persist();
  return { ...state, previousMessage: previous.message };
}

export async function describeMaintenanceState() {
  const current = await getMaintenanceState();
  if (!current.enabled) {
    return 'Bakım modu devre dışı.';
  }

  const parts = ['Bakım modu **aktif**.'];
  if (current.message) {
    parts.push(`Not: ${current.message}`);
  }
  if (current.updatedAt) {
    parts.push(`Güncelleme: <t:${Math.floor(new Date(current.updatedAt).getTime() / 1000)}:R>`);
  }
  return parts.join(' ');
}

export async function waitForMaintenanceWrite() {
  if (pendingWrite) {
    await pendingWrite;
  }
}
