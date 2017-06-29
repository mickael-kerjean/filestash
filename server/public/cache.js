const CACHE_NAME = 'v0.0';
const URLS_TO_CACHE = ['/', '/index.html'];

self.addEventListener('fetch', function(event){
    if(is_a_ressource(event.request)){
        //console.log("> FETCH RESSOURCE", event.request.url)
        return fetchRessource(event);
    }else if(is_an_api_call(event.request)){
        //console.log("> FETCH API", event.request.url)
        return fetchApi(event);
    }else if(is_an_index(event.request)){
        //console.log("> FETCH INDEX", event.request.url)
        return fetchIndex(event);
    }else{
        //console.log("> FETCH FALLBACK", event.request.url)
        return cacheFallback(event);
    }
});

self.addEventListener('activate', function(event){
    //console.log("> ACTIVATE")
    vacuum(event)
});
self.addEventListener('install', function(event){
    //console.log("> INSTALL SERVICE WORKER", navigator)
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
    event.respondWith(
        caches.open(CACHE_NAME).then(function(cache){
            return cache.match(event.request)
                .then(function(response){
                    if(response){
                        fetchAndCache(event).catch(nil)
                        return response;
                    }else{
                        return Promise.reject("OUPS");
                    }
                })
                .catch(function(err){
                    return fetchAndCache(event);
                });
        })
    );

    function fetchAndCache(event){
        // A request is a stream and can only be consumed once. Since we are consuming this
        // once by cache and once by the browser for fetch, we need to clone the response as
        // seen on https://developers.google.com/web/fundamentals/getting-started/primers/service-workers
        const request = event.request.clone();
        
        return fetch(request)
            .then(function(response){
                if(!response){ return response; }

                // A response is a stream and can only because we want the browser to consume the
                // response as well as the cache consuming the response, we need to clone it
                const responseToCache = response.clone(); 
                caches.open(CACHE_NAME).then(function(cache){
                    cache.put(event.request, responseToCache);
                });
                return response;
            });
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
    event.request.url = host(event.request);
    event.respondWith(
        caches.open(CACHE_NAME).then(function(cache){
            return cache.match('/').then(function(response){
                return response || fetch('/').then(function(response) {
                    if(response && response.status === 200){
                        cache.put('/', response.clone());
                    }
                    return response;
                })
            })
        })
    )
}


////////////////////////////////////////
// OTHER STUFF
////////////////////////////////////////
function cacheFallback(event){
    event.respondWith(
        caches.open(CACHE_NAME).then(function(cache){
            return cache.match(event.request).then(function(response){
                if(response){
                    return response;
                }else{
                    return fetch(event.request.clone())
                        .then(function(response){
                            cache.put(event.request, response.clone())
                            return response;
                        });
                }
            });
        })
    )
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
