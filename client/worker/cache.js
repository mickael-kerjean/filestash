const CACHE_NAME = 'v0.3';
const DELAY_BEFORE_SENDING_CACHE = 2000;

/*
 * Control everything going through the wire, applying different
 * strategy for caching, fetching resources
 */
self.addEventListener('fetch', function(event){
    if(is_a_ressource(event.request)){
        return event.respondWith(smartCacheStrategy(event.request));
    }else if(is_an_api_call(event.request)){
        return event;
    }else if(is_an_index(event.request)){
        return event.respondWith(smartCacheStrategy(event.request))
    }else{
        return event;
    }
});


/*
 * When a new service worker is coming in, we need to do a bit of
 * cleanup to get rid of the rotten cache
 */
self.addEventListener('activate', function(event){
    vacuum(event);
});


/*
 * When a newly installed service worker is coming in, we want to use it
 * straight away (make it active). By default it would be in a "waiting state"
 */
self.addEventListener('install', function(event){
    if (self.skipWaiting) { self.skipWaiting(); }
});



////////////////////////////////////////
// Test if what's the request is about
////////////////////////////////////////

function is_a_ressource(request){
    return ['css', 'js', 'img', 'logo', 'manifest.json', 'favicon.ico'].indexOf(_pathname(request)[0]) >= 0 ? true : false;
}

function is_an_api_call(request){
    return _pathname(request)[0] === 'api' ? true : false;
}
function is_an_index(request){
    return ['login', 'files', 'view', 'logout'].indexOf(_pathname(request)[0]) >= 0? true : false;
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
    return request.url.replace(/^http[s]?:\/\/[^\/]*\//, '').split('/')
}

/*
 * Loading Strategy:
 * use what's in cache first to make things faster but refresh it as we receive a response
 */
function smartCacheStrategy(request){
    return caches.open(CACHE_NAME).then(function(cache){
        return cache.match(request)
            .then(function(response){
                if(response && response.status === 200){
                    fetchAndCache(request).catch(nil);
                    response.headers.append('Content-Stale', 'yes');
                    return response;
                }else{
                    return Promise.reject("OUPS");
                }
            })
            .catch(function(err){
                return fetchAndCache(request);
            });
    }).catch(() => request);


    function fetchAndCache(_request){
        // A request is a stream and can only be consumed once. Since we are consuming this
        // once by cache and once by the browser for fetch, we need to clone the response as
        // seen on https://developers.google.com/web/fundamentals/getting-started/primers/service-workers
        return fetch(_request.clone && _request.clone() || _request)
            .then(function(response){
                if(!response || response.status !== 200){ return response; }

                // A response is a stream and can only because we want the browser to consume the
                // response as well as the cache consuming the response, we need to clone it
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(function(cache){
                    cache.put(_request, responseClone);
                });
                return response;
            }).catch(() => _request);
    }
    function nil(e){}
}


// Broken as I didn't understood the Promise.race behavior correctly first ...
// if nothing in cache it just brakes
function networkFirstStrategy(request){
    return new Promise(function(done, error){
        cache(request.clone && request.clone() || request).then(function(response){
            if(!response || !response.headers) return;
            response.headers.append('Content-Stale', 'yes');
            done(response);
        });
        network(request.clone && request.clone() || request)
            .then(done)
            .catch(error);
    }).catch(() => request);

    function network(request){
        return fetch(request)
            .then(function(response){
                if(!response || response.status !== 200) return Promise.reject(response);

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
            .then(function(){ return caches.open(CACHE_NAME); })
            .then(function(_cache){ return _cache.match(_request); });

        function timeout(){
            return new Promise(function(done) {
                setTimeout(function() {
                    done();
                }, DELAY_BEFORE_SENDING_CACHE);
            });
        }
    }
}
