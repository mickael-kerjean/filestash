export const URL_HOME = "/";
export function goToHome(history){
    history.push(URL_HOME);
    return Promise.resolve("ok");
}

export const URL_FILES = "/files";
export function goToFiles(history, path, state){
    history.push(URL_FILES+"?path="+encode_path(path), state);
    return Promise.resolve("ok");
}


export const URL_VIEWER = "/view";
export function goToViewer(history, path, state){
    history.push(URL_VIEWER+"?path="+encode_path(path), state);
    return Promise.resolve("ok");
}

export const URL_LOGIN = "/login";
export function goToLogin(history){
    history.push(URL_EDIT);
    return Promise.resolve("ok");
}

export const URL_LOGOUT = "/logout";
export function goToLogout(history){
    history.push(URL_LOGOUT);
    return Promise.resolve("ok");
}

export const URL_ADMIN = "/admin";

export const URL_SHARE = "/s";

function encode_path(path){
    if(/%2F/.test(path) === false){
        return encodeURIComponent(path).replace(/%2F/g, "/"); // replace slash to make url more friendly
    }else{
        return encodeURIComponent(path) // in case you got a %2F folder somewhere ...
    }
}

export function prepare(path){
    return encodeURIComponent(decodeURIComponent(path.replace(/%/g, "%25")));
}

export function urlParams() {
    let p = "";
    if(window.location.hash){
        p += window.location.hash.replace(/^\#/, "");
    }
    if(window.location.search){
        if(p !== "") p += "&";
        p += window.location.search.replace(/^\?/, "");
    }
    return p.split("&").reduce((mem, chunk) => {
        const d = chunk.split("=");
        if(d.length !== 2) return mem;
        mem[decodeURIComponent(d[0])] = decodeURIComponent(d[1]);
        return mem;
    }, {})
}
