let cache = {};

// cleanup expired cache
setInterval(() => {
    for(let key in cache){
        if(cache[key].date < new Date().getTime()){
            delete cache[key];
        }
    }
}, 120*1000)

export function invalidate(url){
    if(url === undefined){ cache = {}; }
    else if(typeof url === 'string'){
        if(cache[url]){
            delete cache[url];
        }
    }else if(typeof url.exec === 'function'){ // regexp
        for(let key in cache){
            if(url.exec(key)){
                delete cache[key]
            }
        }
    }else{
        throw 'invalidation error';
    }
}
export function http_get(url, cache_expire = 0, type = 'json'){
    if(cache_expire > 0 && cache[url] && cache[url].date > new Date().getTime()){
        return new Promise((done) => done(cache[url].data));
    }else{
        if(cache[url]){ delete cache[url]; }
        return new Promise((done, err) => {
            var xhr = new XMLHttpRequest();
            xhr.withCredentials = true;
            xhr.onreadystatechange = function() {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if(xhr.status === 200){
                        if(type === 'json'){
                            try{
                                let data = JSON.parse(xhr.responseText);
                                if(data.status === 'ok'){
                                    if(cache_expire > 0){
                                        cache[url] = {data: data.results || data.result, date: new Date().getTime() + cache_expire * 1000}
                                    }
                                    done(data.results || data.result)
                                }else{
                                    err(data);
                                }
                            }catch(error){
                                err({message: 'oups', trace: error})
                            }
                        }else{
                            done(xhr.responseText)
                        }                        
                    }else{
                        err({status: xhr.status, message: xhr.responseText || 'Oups something went wrong'})
                    }
                }
            }
            xhr.open('GET', url, true);
            xhr.send(null);    
        });
    }
}


export function http_post(url, data, type = 'json'){
    return new Promise((done, err) => {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.withCredentials = true;
        if(type === 'json'){
            data = JSON.stringify(data);
            xhr.setRequestHeader('Content-Type', 'application/json')
        }
        xhr.send(data);
        xhr.onload = function () {
	        if (xhr.readyState === XMLHttpRequest.DONE) {
                if(xhr.status === 200){
                    try{
                        let data = JSON.parse(xhr.responseText);
                        data.status === 'ok' ? done(data.results || data.result) : err(data);
                    }catch(error){
                        err({message: 'oups', trace: error})
                    }                
                }else{
                    err({status: xhr.status, message: xhr.responseText || 'Oups something went wrong'})
                }
	        }
        }
    });
}

// export function http_put(url, data){
//     return new Promise((done, err) => {
//         var xhr = new XMLHttpRequest();
//         xhr.open("PUT", url, true);
//         xhr.withCredentials = true;
//         //xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
//         xhr.send(data);
//         xhr.onload = function () {
// 	        if (xhr.readyState === XMLHttpRequest.DONE) {
//                 if(xhr.status === 200){
//                     try{
//                         let data = JSON.parse(xhr.responseText);
//                         data.status === 'ok' ? done(data.results || data.result) : err(data);
//                     }catch(error){
//                         err({message: 'oups', trace: error})
//                     }                
//                 }else{
//                     err({status: xhr.status, message: xhr.responseText || 'Oups something went wrong'})
//                 }
// 	        }
//         }
//     });
// }

export function http_delete(url){
    return new Promise((done, err) => {
        var xhr = new XMLHttpRequest();
        xhr.open("DELETE", url, true);
        xhr.withCredentials = true;
        xhr.onload = function () {
	        if (xhr.readyState === XMLHttpRequest.DONE) {
                if(xhr.status === 200){
                    try{
                        let data = JSON.parse(xhr.responseText);
                        data.status === 'ok' ? done(data.results || data.result) : err(data);
                    }catch(error){
                        err({message: 'oups', trace: error})
                    }                
                }else{
                    err({status: xhr.status, message: xhr.responseText || 'Oups something went wrong'})
                }
	        }
        }
        xhr.send(null);
    });
}
