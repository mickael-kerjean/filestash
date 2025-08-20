let VERSION = null;

self.addEventListener("install", (event) => {
    if (!self.EventSource) throw new Error("turboload not supported on this platform");

    event.waitUntil((async() => {
        await self.skipWaiting();
    })());
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async() => {
        for (const name of await caches.keys()) await caches.delete(name);
        await self.clients.claim();
    })());
});

self.addEventListener("fetch", async(event) => {
    if (!event.request.url.startsWith(location.origin + "/assets/")) return;

    event.respondWith((async() => {
        const cache = await caches.open(VERSION);
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) return cachedResponse;
        return fetch(event.request);
    })());
});

self.addEventListener("message", (event) => {
    if (event.data.type === "preload") handlePreloadMessage(
        event.data.payload,
        event.data.clear,
        event.data.version,
        () => event.source.postMessage({ type: "preload", status: "ok" }),
        (err) => event.source.postMessage({ type: "preload", status: "error", msg: err.message }),
    );
});

async function handlePreloadMessage(imports, clear, version, resolve, reject) {
    VERSION = version;
    try {
        await caches.keys().then(async(names) => {
            for (let i = 0; i<names.length; i++) {
                await caches.delete(names[i]);
            }
        });
        const cache = await caches.open(VERSION);
        for (const path in imports) {
            let mime = "application/octet-stream";
            if (path.endsWith(".css")) mime = "text/css";
            else if (path.endsWith(".js")) mime = "application/javascript";
            await cache.put(location.origin + path, new Response(
                new Blob([imports[path]]),
                { headers: { "Content-Type": mime } },
            ));
        }
        resolve();
    } catch (err) {
        console.log("ERR", err);
        reject(err);
    }
};
