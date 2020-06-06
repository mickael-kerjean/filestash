export function http_get(url, type = 'json'){
    return new Promise((done, err) => {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.withCredentials = true;
        xhr.setRequestHeader('X-Requested-With', 'XmlHttpRequest');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if(xhr.status === 200){
                    if(type === 'json'){
                        try{
                            let data = JSON.parse(xhr.responseText);
                            if("status" in data === false || data.status === 'ok'){
                                done(data);
                            }else{
                                err(data);
                            }
                        }catch(error){
                            err({message: 'oops', trace: error});
                        }
                    }else{
                        done(xhr.responseText);
                    }
                }else{
                    handle_error_response(xhr, err);
                }
            }
        }
        xhr.send(null);
        xhr.onerror = function(){
            handle_error_response(xhr, err)
        }
    });
}

export function http_post(url, data, type = 'json', params){
    return new Promise((done, err) => {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.withCredentials = true;
        xhr.setRequestHeader('X-Requested-With', 'XmlHttpRequest');
        if(type === 'json'){
            data = JSON.stringify(data);
            xhr.setRequestHeader('Content-Type', 'application/json');
        }
        if (params && params.progress) {
            xhr.upload.addEventListener("progress", params.progress, false);
        }
        xhr.send(data);
        xhr.onload = function () {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if(xhr.status === 200){
                    try{
                        let data = JSON.parse(xhr.responseText);
                        if(data.status === 'ok'){
                            done(data);
                        }else{
                            err(data);
                        }
                    }catch(error){
                        err({message: 'oops', trace: error});
                    }
                }else{
                    handle_error_response(xhr, err);
                }
            }
        }
        xhr.onerror = function(){
            handle_error_response(xhr, err)
        }
        if (params && params.abort) {
            params.abort(() => {
                xhr.abort();
                err({ message: 'aborted' });
            })
        }
    });
}

export function http_delete(url){
    return new Promise((done, err) => {
        var xhr = new XMLHttpRequest();
        xhr.open("DELETE", url, true);
        xhr.withCredentials = true;
        xhr.setRequestHeader('X-Requested-With', 'XmlHttpRequest');
        xhr.onload = function () {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if(xhr.status === 200){
                    try{
                        let data = JSON.parse(xhr.responseText);
                        if(data.status === 'ok'){
                            done(data);
                        }else{
                            err(data);
                        }
                    }catch(error){
                        err({message: 'oops', trace: error});
                    }
                }else{
                    handle_error_response(xhr, err);
                }
            }
        }
        xhr.onerror = function(){
            handle_error_response(xhr, err)
        }
        xhr.send(null);
    });
}

export function http_options(url){
    return new Promise((done, err) => {
        var xhr = new XMLHttpRequest();
        xhr.open("OPTIONS", url, true);
        xhr.withCredentials = true;
        xhr.setRequestHeader('X-Requested-With', 'XmlHttpRequest');
        xhr.onload = function(){
            if(xhr.readyState === XMLHttpRequest.DONE){
                if(xhr.status !== 200){
                    handle_error_response(xhr, err);
                    return
                }
                done(xhr.getAllResponseHeaders()
                     .split("\n")
                     .reduce((acc, r) => {
                         const a = r.split(": ");
                         acc[a[0]] = a[1];
                         return acc;
                     }, {}));
            }
        }
        xhr.send(null);
    })
}


function handle_error_response(xhr, err){
    const response = (function(content){
        let message = content;
        try{
            message = JSON.parse(content);
        }catch(err){}
        return message || {};
    })(xhr.responseText);

    const message = response.message || null;

    if(navigator.onLine === false){
        err({message: 'Connection Lost', code: "NO_INTERNET"});
    }else if(xhr.status === 0 && xhr.responseText === "") {
        err({message: "Service unavailable. If the problem persists, contact your administrator", code: "INTERNAL_SERVER_ERROR"});
    }else if(xhr.status === 500){
        err({message: message || "Oops something went wrong with our servers", code: "INTERNAL_SERVER_ERROR"});
    }else if(xhr.status === 401){
        err({message: message || "Authentication error", code: "Unauthorized"});
    }else if(xhr.status === 403){
        err({message: message || "You can\'t do that", code: "Forbidden"});
    }else if(xhr.status === 413){
        err({message: message || "Payload too large", code: "PAYLOAD_TOO_LARGE"});
    }else if(xhr.status === 502){
        err({message: message || "The destination is acting weird", code: "BAD_GATEWAY"});
    }else if(xhr.status === 409){
        if(response["error_summary"]){ // dropbox way to say doesn't exist
            err({message: "Doesn\'t exist", code: "UNKNOWN_PATH"})
        }else{
            err({message: message || "Oops you just ran into a conflict", code: "CONFLICT"});
        }
    }else{
        err({message: message || 'Oops something went wrong'});
    }
}
