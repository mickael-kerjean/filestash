export function http_get(url, type = 'json'){
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
                                done(data);
                            }else{
                                err(data);
                            }
                        }catch(error){
                            err({message: 'oups', trace: error});
                        }
                    }else{
                        done(xhr.responseText);
                    }
                }else{
                    handle_error_response(xhr, err);
                }
            }
        }
        xhr.open('GET', url, true);
        xhr.send(null);
    });
}

export function http_post(url, data, type = 'json'){
    return new Promise((done, err) => {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.withCredentials = true;
        if(type === 'json'){
            data = JSON.stringify(data);
            xhr.setRequestHeader('Content-Type', 'application/json');
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
                        err({message: 'oups', trace: error});
                    }
                }else{
                    handle_error_response(xhr, err);
                }
            }
        }
    });
}

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
                        if(data.status === 'ok'){
                            done(data);
                        }else{
                            err(data);
                        }
                    }catch(error){
                        err({message: 'oups', trace: error});
                    }
                }else{
                    handle_error_response(xhr, err);
                }
            }
        }
        xhr.send(null);
    });
}



function handle_error_response(xhr, err){
    let message = (function(content){
        let message = content;
        try{
            message = JSON.parse(content)['message'];
        }catch(err){}
        return message;
    })(xhr.responseText);

    if(xhr.status === 500){
        err({message: message || "Oups something went wrong with our servers"})
    }else if(xhr.status === 401){
        if(location.pathname !== '/login'){ location.pathname = "/login"; }
        err({message: message || "Authentication error"});
    }else if(xhr.status === 403){
        err({message: message || "You can\'t do that"});
    }else if(xhr.status === 413){
        err({message: message || "Payload too large"});
    }else if(navigator.onLine === false){
        err({status: xhr.status, code: "CONNECTION_LOST", message: 'Connection Lost'});
    }else{
        err({status: xhr.status, message: xhr.responseText || 'Oups something went wrong'});
    }

}
