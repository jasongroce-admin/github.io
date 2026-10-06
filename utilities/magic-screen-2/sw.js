/* Magic Screen 2. Serves the app from verified part files. */
const ROUTES = {
  "/utilities/magic-screen-2/": ["parts/html-00.txt", "parts/html-01.txt", "parts/html-02.txt", "parts/html-03.txt"],
  "/utilities/magic-screen-2/assets/index-Bp2UkgTU.js": ["parts/js-00.txt", "parts/js-01.txt", "parts/js-02.txt", "parts/js-03.txt", "parts/js-04.txt", "parts/js-05.txt", "parts/js-06.txt", "parts/js-07.txt", "parts/js-08.txt", "parts/js-09.txt", "parts/js-10.txt", "parts/js-11.txt", "parts/js-12.txt", "parts/js-13.txt", "parts/js-14.txt", "parts/js-15.txt", "parts/js-16.txt", "parts/js-17.txt", "parts/js-18.txt", "parts/js-19.txt", "parts/js-20.txt", "parts/js-21.txt", "parts/js-22.txt", "parts/js-23.txt", "parts/js-24.txt", "parts/js-25.txt", "parts/js-26.txt"],
  "/utilities/magic-screen-2/assets/routes-DghZx34v.js": ["parts/rt-00.txt", "parts/rt-01.txt", "parts/rt-02.txt", "parts/rt-03.txt", "parts/rt-04.txt", "parts/rt-05.txt"]
};
const BASE64 = new Set(["/utilities/magic-screen-2/"]);
const APP_HEADER_CLASSES = "flex h-14 shrink-0 items-center gap-2 overflow-x-auto border-b border-line bg-surface px-3";
const APP_LINK_CLASSES = "inline-flex h-11 shrink-0 items-center rounded-md px-3 text-sm font-medium text-accent hover:bg-surface-2";
const SSR_HEADER_MARKER = '<header class="' + APP_HEADER_CLASSES + '">';
const CLIENT_HEADER_MARKER = '(0,R.jsxs)(`header`,{className:`' + APP_HEADER_CLASSES + '`,children:[';
const APP_NAV_HTML = '<nav aria-label="Site navigation" class="flex shrink-0 items-center gap-1"><a href="/" aria-label="Jason Groce home" class="' + APP_LINK_CLASSES + '">Home</a><a href="/utilities/index.html" class="' + APP_LINK_CLASSES + '">Apps &amp; tools</a></nav>';
const APP_NAV_CLIENT = '(0,R.jsxs)(`nav`,{"aria-label":`Site navigation`,className:`flex shrink-0 items-center gap-1`,children:[(0,R.jsx)(`a`,{href:`/`,"aria-label":`Jason Groce home`,className:`' + APP_LINK_CLASSES + '`,children:`Home`}),(0,R.jsx)(`a`,{href:`/utilities/index.html`,className:`' + APP_LINK_CLASSES + '`,children:`Apps & tools`})]})';
function insertAtAppHeader(body, marker, navigation) {
  const position = body.indexOf(marker);
  if (position < 0 || position !== body.lastIndexOf(marker)) throw new Error("Magic Screen header was not found uniquely.");
  return body.slice(0, position) + marker + navigation + body.slice(position + marker.length);
}
self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", (event) => {
  const pathname = new URL(event.request.url).pathname;
  if (pathname === "/utilities/magic-screen-2/app.html" || pathname === "/utilities/magic-screen-2/index.html") {
    event.respondWith(Response.redirect(new URL("/utilities/magic-screen-2/", event.request.url).href, 302));
    return;
  }
  const rels = ROUTES[pathname];
  if (!rels) return;
  event.respondWith((async () => {
    let text = "";
    for (const rel of rels) {
      const res = await fetch(new URL(rel, self.registration.scope), { cache: "no-cache" });
      if (!res.ok) throw new Error("Missing " + rel);
      text += await res.text();
    }
    const html = BASE64.has(new URL(event.request.url).pathname);
    let body = html
      ? new TextDecoder().decode(Uint8Array.from(atob(text.replace(/\s+/g, "")), (c) => c.charCodeAt(0)))
      : text;
    // Keep server markup and the hydrated component identical without changing stored app parts.
    if (html) {
      body = insertAtAppHeader(body, SSR_HEADER_MARKER, APP_NAV_HTML);
      body = body.replace("</head>", '<link rel="stylesheet" href="/utilities/magic-screen-2/brush-recipes.css"></head>');
      body = body.replace("</body>", '<script src="/utilities/magic-screen-2/brush-recipes.js"></script></body>');
    }
    else if (pathname === "/utilities/magic-screen-2/assets/routes-DghZx34v.js") {
      body = insertAtAppHeader(body, CLIENT_HEADER_MARKER, APP_NAV_CLIENT + ",");
    }
    const type = html ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8";
    return new Response(body, { headers: { "Content-Type": type, "Cache-Control": "no-cache" } });
  })());
});
