import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'pro-members.json');

let cache = new Set();
let loaded = false;
let writing = null;

async function ensureLoaded() {
  if (loaded) return;

  if (!existsSync(storagePath)) {
    cache = new Set();
    loaded = true;
    return;
  }

  try {
    const raw = await readFile(storagePath, 'utf8');
    const parsed = JSON.parse(raw.toString());
    cache = new Set(Array.isArray(parsed) ? parsed : []);
  } catch (error) {
    console.warn('⚠️ Pro üyelik verileri okunamadı. Varsayılan boş liste kullanılacak.', error);
    cache = new Set();
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(Array.from(cache), null, 2);
  writing = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Pro üyelik verileri kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writing = null;
    });

  await writing;
}

export async function isProMember(userId) {
  if (!userId) return false;
  await ensureLoaded();
  return cache.has(userId);
}

export async function grantPro(userId) {
  if (!userId) throw new Error('Kullanıcı kimliği belirtilmeli.');
  await ensureLoaded();
  cache.add(userId);
  await persist();
  return true;
}

export async function revokePro(userId) {
  if (!userId) throw new Error('Kullanıcı kimliği belirtilmeli.');
  await ensureLoaded();
  const existed = cache.delete(userId);
  if (existed) {
    await persist();
  }
  return existed;
}

export async function listProMembers() {
  await ensureLoaded();
  return Array.from(cache);
}

export async function clearProMembers() {
  await ensureLoaded();
  cache.clear();
  await persist();
}
