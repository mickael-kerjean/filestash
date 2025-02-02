const CACHENAME = "assets";

/*
 * This Service Worker is an optional optimisation to load the app faster.
 * Whenever using raw es module without any build, we had a large number
 * of assets getting through the network. When we looked through the
 * developer console -> network, and look at the timing, 98% of the time
 * was spent "waiting for the server response".
 * HTTP2/3 should solve that issue but we don't control the proxy side of
 * things of how people install Filestash, hence the idea to bulk download
 * as much as we can through SSE, store it onto a cache and get our
 * service worker to inject the response.
 * This approach alone make the app a lot faster to load but relies on
 * the server being able to bundle our assets via SSE.
 *
 * TODO:
 * - wait until browser support DecompressionStream("brotli") natively
 *   and use that. As of 2025, downloading a brotli decompress library
 *   make the gain br / gz negative for our app
 * - wait until Firefox support SSE within service worker. As of 2025,
 *   someone was implementing it in Firefox but it's not everywhere yet
 *   Once that's done, we want to be 100% sure everything is working great
 */

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

self.addEventListener("fetch", (event) => {
    if (!event.request.url.startsWith(location.origin + "/assets/")) return;

    event.respondWith((async() => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        return fetch(event.request);
    })());
});

self.addEventListener("message", (event) => {
    if (event.data.type === "preload") handlePreloadMessage(
        event.data.payload,
        () => event.source.postMessage({ type: "preload", status: "ok" }),
        (err) => event.source.postMessage({ type: "preload", status: "error", msg: err.message }),
    );
});

const handlePreloadMessage = (() => {
    const cleanup = [];
    return async(chunks, resolve, reject) => {
        cleanup.forEach((fn) => fn());
        try {
            caches.delete(CACHENAME);
            const cache = await caches.open(CACHENAME);
            await Promise.all(chunks.map((urls) => {
                return preload({ urls, cache, cleanup });
            }));
            resolve();
        } catch (err) {
            reject(err);
        }
    };
})();

async function preload({ urls, cache, cleanup }) {
    const evtsrc = new self.EventSource("/assets/bundle?" + urls.map((url) => `url=${url}`).join("&"));
    cleanup.push(() => evtsrc.close());

    let i = 0;
    const messageHandler = (resolve, event) => {
        const url = event.lastEventId;
        let mime = "application/octet-stream";
        if (url.endsWith(".css")) mime = "text/css";
        else if (url.endsWith(".js")) mime = "application/javascript";

        i += 1;
        cache.put(
            location.origin + event.lastEventId,
            new Response(
                new Blob([Uint8Array.from(atob(event.data), (c) => c.charCodeAt(0))])
                    .stream()
                    .pipeThrough(new DecompressionStream("gzip")),
                { headers: { "Content-Type": mime } },
            ),
        );
        if (i === urls.length) {
            evtsrc.close();
            resolve();
        }
    };
    const errorHandler = (reject, err) => {
        evtsrc.close();
        reject(err);
    };

    await new Promise((resolve, reject) => {
        evtsrc.onmessage = async(event) => messageHandler(resolve, event);
        evtsrc.onerror = (err) => errorHandler(reject, err);
    });
}
