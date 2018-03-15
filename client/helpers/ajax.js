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
                            }else if(data.status === 'redirect'){
                                if(data.to === 'logout'){location.pathname = "/logout";}
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
                    if(navigator.onLine === false){
                        err({status: xhr.status, code: "CONNECTION_LOST", message: 'Connection Lost'});
                    }else{
                        err({status: xhr.status, message: xhr.responseText || 'Oups something went wrong'});
                    }
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
                        }else if(data.status === 'redirect'){
                            if(data.to === 'logout'){location.pathname = "/logout";}
                        }else{
                            err(data);
                        }
                    }catch(error){
                        err({message: 'oups', trace: error});
                    }
                }else{
                    if(navigator.onLine === false){
                        err({status: xhr.status, code: "CONNECTION_LOST", message: 'Connection Lost'});
                    }else{
                        err({status: xhr.status, message: xhr.responseText || 'Oups something went wrong'});
                    }
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
                        }else if(data.status === 'redirect'){
                            if(data.to === 'logout'){location.pathname = "/logout";}
                        }else{
                            err(data);
                        }
                    }catch(error){
                        err({message: 'oups', trace: error});
                    }
                }else{
                    if(navigator.onLine === false){
                        err({status: xhr.status, code: "CONNECTION_LOST", message: 'Connection Lost'});
                    }else{
                        err({status: xhr.status, message: xhr.responseText || 'Oups something went wrong'});
                    }
                }
            }
        }
        xhr.send(null);
    });
}
