/*
 * Fetch Polyfill
 * Bazı ortamlarda (örneğin Node.js 16) yerleşik fetch desteği bulunmadığı için
 * ihtiyaç duyulduğunda node-fetch paketini dinamik olarak yükleyip globalThis.fetch
 * üzerine atıyoruz. Node.js 18 ve üzerindeki ortamlarda bu dosya hiçbir değişiklik
 * yapmadan çıkacaktır.
 */

if (typeof globalThis.fetch !== 'function') {
  import('node-fetch')
    .then(({ default: fetchFn }) => {
      if (typeof fetchFn === 'function') {
        globalThis.fetch = (...args) => fetchFn(...args);
      }
    })
    .catch((error) => {
      console.warn('node-fetch modülü yüklenemedi. Dış veri kullanan komutlar çalışmayabilir.', error);
    });
}

export {}; // ES Module olarak davranması için boş export
