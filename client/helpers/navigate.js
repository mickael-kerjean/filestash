export const URL_HOME = '/';
export function goToHome(history){
    history.push(URL_HOME);
    return Promise.resolve('ok');
}

export const URL_FILES = '/files';
export function goToFiles(history, path, state){
    history.push(URL_FILES+"?path="+encode_path(path), state);
    return Promise.resolve('ok');
}


export const URL_VIEWER = '/view';
export function goToViewer(history, path, state){
    history.push(URL_VIEWER+'?path='+encode_path(path), state);
    return Promise.resolve('ok');
}

export const URL_LOGIN = '/login';
export function goToLogin(history){
    history.push(URL_EDIT);
    return Promise.resolve('ok');
}

export const URL_LOGOUT = '/logout';
export function goToLogout(history){
    history.push(URL_LOGOUT);
    return Promise.resolve('ok');
}

function encode_path(path){
    if(/%2F/.test(path) === false){
        return encodeURIComponent(path).replace(/%2F/g, '/'); // replace slash to make url more friendly
    }else{
        return encodeURIComponent(path) // in case you got a %2F folder somewhere ...
    }
}

export function prepare(path){
    return encodeURIComponent(decodeURIComponent(path)); // to send our url correctly without using directly '/'
}
