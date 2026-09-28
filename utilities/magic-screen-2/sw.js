/* Magic Screen 2. Joins uploaded parts into the real app files. */
const ROUTES = {"/utilities/magic-screen-2/app.html":["parts/html-00.txt","parts/html-01.txt","parts/html-02.txt","parts/html-03.txt"],"/utilities/magic-screen-2/assets/index-Bp2UkgTU.js":["parts/js-00.txt","parts/js-01.txt","parts/js-02.txt","parts/js-03.txt","parts/js-04.txt","parts/js-05.txt","parts/js-06.txt","parts/js-07.txt","parts/js-08.txt","parts/js-09.txt","parts/js-10.txt","parts/js-11.txt","parts/js-12.txt","parts/js-13.txt","parts/js-14.txt","parts/js-15.txt","parts/js-16.txt","parts/js-17.txt","parts/js-18.txt","parts/js-19.txt","parts/js-20.txt","parts/js-21.txt","parts/js-22.txt","parts/js-23.txt","parts/js-24.txt","parts/js-25.txt","parts/js-26.txt"],"/utilities/magic-screen-2/assets/routes-DghZx34v.js":["parts/rt-00.txt","parts/rt-01.txt","parts/rt-02.txt","parts/rt-03.txt","parts/rt-04.txt","parts/rt-05.txt"],"/utilities/magic-screen-2/assets/styles-BNVo4xsI.css":["parts/css-00.txt","parts/css-01.txt"]};
const BASE64 = new Set(["/utilities/magic-screen-2/app.html"]);
self.addEventListener("install", () => { self.skipWaiting(); });
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
    let body, type;
    if (BASE64.has(url.pathname)) {
      const bytes = Uint8Array.from(atob(text.replace(/\s+/g, "")), (c) => c.charCodeAt(0));
      body = new TextDecoder().decode(bytes);
      type = "text/html; charset=utf-8";
    } else {
      body = text;
      type = url.pathname.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8";
    }
    return new Response(body, { headers: { "Content-Type": type, "Cache-Control": "no-cache" } });
  })());
});
