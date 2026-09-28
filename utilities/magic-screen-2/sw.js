/* Magic Screen 2 asset stitcher. Chunks are joined in order. */
const VERSION = "ms2-1";
const ROUTES = {"/utilities/magic-screen-2/app.html":["parts/p000","parts/p001","parts/p002","parts/p003"],"/utilities/magic-screen-2/assets/styles-BNVo4xsI.css":["parts/p004","parts/p005","parts/p006"],"/utilities/magic-screen-2/assets/routes-DghZx34v.js":["parts/p007","parts/p008","parts/p009","parts/p010","parts/p011","parts/p012","parts/p013","parts/p014","parts/p015"],"/utilities/magic-screen-2/assets/index-Bp2UkgTU.js":["parts/p016","parts/p017","parts/p018","parts/p019","parts/p020","parts/p021","parts/p022","parts/p023","parts/p024","parts/p025","parts/p026","parts/p027","parts/p028","parts/p029","parts/p030","parts/p031","parts/p032","parts/p033","parts/p034","parts/p035","parts/p036","parts/p037","parts/p038","parts/p039","parts/p040","parts/p041","parts/p042","parts/p043","parts/p044","parts/p045","parts/p046","parts/p047","parts/p048","parts/p049","parts/p050","parts/p051","parts/p052","parts/p053","parts/p054","parts/p055","parts/p056","parts/p057","parts/p058","parts/p059"]};
self.addEventListener("install", (event) => { self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const rels = ROUTES[url.pathname];
  if (!rels) return;
  event.respondWith((async () => {
    let text = "";
    for (const rel of rels) {
      const res = await fetch(new URL(rel, self.registration.scope), { cache: "no-cache" });
      if (!res.ok) throw new Error("Missing " + rel);
      text += await res.text();
    }
    const path = url.pathname;
    const type = path.endsWith(".css") ? "text/css; charset=utf-8"
      : path.endsWith(".html") ? "text/html; charset=utf-8"
      : "text/javascript; charset=utf-8";
    return new Response(text, { headers: { "Content-Type": type, "Cache-Control": "no-cache" } });
  })());
});
