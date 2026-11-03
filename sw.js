// 韓国語初級完成編２ 用 Service Worker
// - Chromeの「インストール」条件を満たすため、fetchハンドラを必ず持たせる
// - 画面本体(HTML)はネットワーク優先(失敗時は自アプリのキャッシュ)
// - 同じドメイン上の他アプリのキャッシュには一切触れない(自分のキャッシュ名だけを管理する)
// - GASへの通信(script.google.com / googleusercontent)やPOSTは一切横取りしない
const CACHE_PREFIX = 'kr-shokyu2-';
const CACHE_NAME = CACHE_PREFIX + 'v1';

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        // このアプリの古い版のキャッシュだけを削除する(他アプリのキャッシュは残す)
        if (k.indexOf(CACHE_PREFIX) === 0 && k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // GAS(データ取得・更新)は常にそのままネットワークへ
  if (url.hostname === 'script.google.com' || url.hostname.endsWith('script.googleusercontent.com')) return;

  // 同一オリジンのページ・ファイル: ネットワーク優先、失敗したら自アプリのキャッシュ
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.open(CACHE_NAME).then(function (cache) {
          return cache.match(req).then(function (hit) {
            return hit || cache.match(self.registration.scope);
          });
        });
      })
    );
  }
});
