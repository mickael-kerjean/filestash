let VERSION = null;

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

async function handlePreloadMessage(chunks, clear, version, resolve, reject) {
    VERSION = version;
    const cleanup = [];
    try {
        let execHTTP = true;
        await caches.keys().then(async(names) => {
            for (let i=0; i<names.length; i++) {
                if (names[i] === VERSION && !clear) {
                    execHTTP = false;
                    return;
                }
                await caches.delete(names[i]);
            }
        });
        if (execHTTP) {
            const cache = await caches.open(VERSION);
            chunks = await Promise.all(chunks.map(async(urls) => {
                const missing = [];
                await Promise.all(urls.map(async(url) => {
                    if (!await cache.match(location.origin + url)) missing.push(url);
                }));
                return missing;
            }));
            if (chunks.filter((urls) => urls.length > 0).length > 0) {
                await Promise.all(chunks.map((urls) => {
                    return preload({ urls, cache, cleanup });
                }));
            }
        }
        resolve();
    } catch (err) {
        console.log("ERR", err);
        reject(err);
    } finally {
        cleanup.forEach((fn) => fn());
    }
};

async function preload({ urls, cache, cleanup }) {
    const evtsrc = new self.EventSource("/assets/bundle?" + urls.map((url) => `url=${url}`).join("&"));
    cleanup.push(() => evtsrc.close());

    let i = 0;
    const messageHandler = async(resolve, event, decoder) => {
        const url = event.lastEventId;
        let mime = "application/octet-stream";
        if (url.endsWith(".css")) mime = "text/css";
        else if (url.endsWith(".js")) mime = "application/javascript";

        i += 1;
        await cache.put(
            location.origin + url,
            new Response(
                decoder(new Blob([base128Decode(event.data)]).stream()),
                { headers: { "Content-Type": mime } },
            ),
        );
        if (i === urls.length) {
            resolve();
        }
    };
    const errorHandler = (reject, err) => {
        reject(err);
    };

    await new Promise((resolve, reject) => {
        evtsrc.addEventListener("static::raw", (event) => messageHandler(
            resolve,
            event,
            (stream) => stream,
        ));
        evtsrc.addEventListener("static::gzip", (event) => messageHandler(
            resolve,
            event,
            (stream) => stream.pipeThrough(new DecompressionStream("gzip")),
        ));
        evtsrc.onerror = (err) => {
            if (i === urls.length) return;
            errorHandler(reject, err);
        };
    });
}

function base128Decode(s) { // encoder is in server/ctrl/static.go -> encodeB128
    const out = new Uint8Array(Math.floor((s.length * 7) / 8) + 1);
    let acc = 0;
    let bits = 0;
    let oi = 0;
    for (let i = 0; i < s.length; i++) {
        const ch = s.charCodeAt(i);
        const digit = ch & 0x7F; // undo 0x80 masking for NUL/LF/CR
        acc = (acc << 7) | digit;
        bits += 7;
        while (bits >= 8) {
            bits -= 8;
            out[oi++] = (acc >> bits) & 0xFF;
            acc &= (1 << bits) - 1;
        }
    }
    return out.subarray(0, oi);
}
