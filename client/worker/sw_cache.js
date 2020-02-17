const CACHE_NAME = "v0.3";
const DELAY_BEFORE_SENDING_CACHE = 2000;

/*
 * Control everything going through the wire, applying different
 * strategy for caching, fetching resources
 */
self.addEventListener("fetch", function(event){
    if(is_a_ressource(event.request)){
        return event.respondWith(cacheFirstStrategy(event));
    }else if(is_an_api_call(event.request)){
        return event;
    }else if(is_an_index(event.request)){
        return event.respondWith(cacheFirstStrategy(event));
    }else{
        return event;
    }
});

/*
 * When a new service worker is coming in, we need to do a bit of
 * cleanup to get rid of the rotten cache
 */
self.addEventListener("activate", function(event){
    vacuum(event);
});

self.addEventListener("error", function(err){
    console.error(err);
});

/*
 * When a newly installed service worker is coming in, we want to use it
 * straight away (make it active). By default it would be in a "waiting state"
 */
self.addEventListener("install", function(event){
    caches.open(CACHE_NAME).then(function(cache) {
        return cache.addAll([
            "/",
            "/api/config"
        ]);
    });

    if (self.skipWaiting) { self.skipWaiting(); }
});



function is_a_ressource(request){
    const p = _pathname(request);
    if(["assets", "manifest.json", "favicon.ico"].indexOf(p[0]) !== -1){
        return true;
    } else if(p[0] === "api" && (p[1] === "config")){
        return true;
    }
    return false;
}

function is_an_api_call(request){
    return _pathname(request)[0] === "api" ? true : false;
}
function is_an_index(request){
    return ["files", "view", "login", "logout", ""].indexOf(_pathname(request)[0]) >= 0? true : false;
}


////////////////////////////////////////
// HELPERS
////////////////////////////////////////

function vacuum(event){
    return event.waitUntil(
        caches.keys().then(function(cachesName){
            return Promise.all(cachesName.map(function(cacheName){
                if(cacheName !== CACHE_NAME){
                    return caches.delete(cacheName);
                }
            }));
        })
    );
}

function _pathname(request){
    return request.url.replace(/^http[s]?:\/\/[^\/]*\//, "").split("/")
}

/*
 * strategy is cache first:
 * 1. use whatever is in the cache
 * 2. perform the network call to update the cache
 */
function cacheFirstStrategy(event){
    return caches.open(CACHE_NAME).then(function(cache){
        return cache.match(event.request).then(function(response){
            if(!response){
                return fetchAndCache(event);
            }

            fetchAndCache(event).catch(nil);
            return response;
        });
    });

    function fetchAndCache(event){
        // A request is a stream and can only be consumed once. Since we are consuming this
        // once by cache and once by the browser for fetch, we need to clone the response as
        // seen on https://developers.google.com/web/fundamentals/getting-started/primers/service-workers
        return fetch(event.request)
            .then(function(response){
                if(!response || response.status !== 200){ return response; }

                // A response is a stream and can only because we want the browser to consume the
                // response as well as the cache consuming the response, we need to clone it
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(function(cache){
                    cache.put(event.request, responseClone);
                });
                return response;
            });
    }
    function nil(e){}
}
