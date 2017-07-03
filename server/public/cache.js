const CACHE_NAME = 'v0.0';
const URLS_TO_CACHE = ['/', '/index.html'];
const DELAY_BEFORE_SENDING_CACHE = 500;

self.addEventListener('fetch', function(event){
    if(is_a_ressource(event.request)){
        return fetchRessource(event);
    }else if(is_an_api_call(event.request)){
        return fetchApi(event);
    }else if(is_an_index(event.request)){
        return fetchIndex(event);
    }else{
        return cacheFallback(event);
    }
});

self.addEventListener('activate', function(event){
    vacuum(event)
});
self.addEventListener('install', function(event){
    if (self.skipWaiting) { self.skipWaiting(); }
})

////////////////////////////////////////
// ASSETS AND RESSOURCES
////////////////////////////////////////

function is_a_ressource(request){
    return ['css', 'js', 'img', 'logo', 'manifest.json', 'favicon.ico'].indexOf(pathname(request)[0]) >= 0 ? true : false;
}

/*
 * cache agressively but refresh the cache if possible
 */
function fetchRessource(event){
    if(navigator.standalone === true || navigator.onLine === false){
        event.respondWith(cacheThenNetwork(event.request))
    }else{
        event.respondWith(networkThenCache(event.request));
    }
}



////////////////////////////////////////
// API CALL
////////////////////////////////////////
function is_an_api_call(request){
    return pathname(request)[0] === 'api' ? true : false;
}

function fetchApi(event){
}



////////////////////////////////////////
// INDEX CALL
////////////////////////////////////////
function is_an_index(request){
    return ['login', 'files', 'view', 'logout'].indexOf(pathname(request)[0]) >= 0? true : false;
}
function fetchIndex(event){
    if(navigator.standalone === true || navigator.onLine === false){
        event.respondWith(cacheThenNetwork(event.request))
    }else{
        event.respondWith(networkThenCache(event.request));
    }
}


////////////////////////////////////////
// OTHER STUFF
////////////////////////////////////////
function cacheFallback(event){
    event.respondWith(cacheThenNetwork(event.request));
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

function host(request){
    return request.url.replace(/(http[s]?\:\/\/[^\/]*\/).*/, '$1');
}
function pathname(request){
    return request.url.replace(/^http[s]?:\/\/[^\/]*\//, '').split('/')
}
function nil(e){}


function cacheThenNetwork(request){
    return caches.open(CACHE_NAME).then(function(cache){
        return cache.match(request)
            .then(function(response){
                if(response){
                    fetchAndCache(request).catch(nil)
                    return response;
                }else{
                    return Promise.reject("OUPS");
                }
            })
            .catch(function(err){
                return fetchAndCache(request);
            });
    });


    function fetchAndCache(_request){
        // A request is a stream and can only be consumed once. Since we are consuming this
        // once by cache and once by the browser for fetch, we need to clone the response as
        // seen on https://developers.google.com/web/fundamentals/getting-started/primers/service-workers
        return fetch(_request.clone && _request.clone() || _request)
            .then(function(response){
                if(!response){ return response; }

                // A response is a stream and can only because we want the browser to consume the
                // response as well as the cache consuming the response, we need to clone it
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(function(cache){
                    cache.put(_request, responseClone);
                });
                return response;
            });
    }
}

function networkThenCache(request){
    let timeoutId;

    return Promise.race([
        cache(request.clone && request.clone() || request),
        network(request.clone && request.clone() || request)
    ])

    function network(request){
        return fetch(request)
            .then(function(response){
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(function(cache){
                    cache.put(request, responseClone);
                });
                return Promise.resolve(response);
            })
            .catch(function(){
                return cache(request.clone && request.clone() || request)
            });
    }

    function cache(_request){
        return timeout()
            .then(function(){ return caches.open(CACHE_NAME)})
            .then(function(_cache){
                return _cache.match(_request);
            });

        function timeout(){
            return new Promise(function(resolve) {
                setTimeout(function() {
                    resolve();
                }, DELAY_BEFORE_SENDING_CACHE);
            });
        }
    }
}
