self.addEventListener('install', (e) => {
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  try {
    const url = new URL(event.request.url);
    if (
      url.pathname.endsWith('/examples/pwa-share/share-target') &&
      event.request.method === 'POST'
    ) {
      event.respondWith(handleShareTarget(event));
    }
  } catch (err) {
    // ignore
  }
});

async function handleShareTarget(event) {
  const req = event.request;
  let form = {};
  try {
    const fd = await req.formData();
    const title = fd.get('title');
    const text = fd.get('text');
    const url = fd.get('url');
    const files = fd.getAll('files') || [];
    const filesInfo = [];
    for (const f of files) {
      if (f && f.name) filesInfo.push({ name: f.name, type: f.type });
    }
    form = { title, text, url, files: filesInfo };
  } catch (err) {
    form = { error: String(err) };
  }

  // Broadcast to all controlled clients
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of all) {
    client.postMessage({ type: 'shared', data: form });
  }

  // Redirect to app start so the PWA opens
  return Response.redirect('/examples/pwa-share/?shared=1', 303);
}
