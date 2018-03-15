// doc: https://www.dropbox.com/developers/documentation/http/documentation

var http = require('request-promise'),
    http_stream = require('request'),
    Path = require('path'),
    config = require('../../../config_server'),
    toString = require('stream-to-string'),
    Readable = require('stream').Readable;

function query(params, uri, method = 'GET', data, opts = {}){
    if(!opts.headers) opts.headers = {};
    opts.headers['Authorization'] = 'Bearer '+params.bearer;
    opts.uri = uri;
    opts.method = method;
    if(data && typeof data === 'object'){
        opts.body = JSON.stringify(data);
        opts.headers["Content-Type"] = "application/json";
    }
    return http(opts)
        .then((res) => Promise.resolve(JSON.parse(res)))
        .catch((res) => {
            if(res && res.response && res.response.body){
                return Promise.reject(res.response.body);
            }else{
                return Promise.reject(res);
            }
        })
}
function query_stream(params, uri, method = 'GET', data, opts = {}){
    if(!opts.headers) opts.headers = {};
    opts.headers['Authorization'] = 'Bearer '+params.bearer;
    opts.uri = uri;
    opts.method = method;
    opts.body = data;
    return Promise.resolve(http_stream(opts));
}

module.exports = {
    auth: function(params){
        let url = "https://www.dropbox.com/oauth2/authorize?client_id="+config.dropbox.clientID+"&response_type=token&redirect_uri="+config.dropbox.redirectURI+"&state=dropbox"
        return Promise.resolve(url)
    },
    test: function(params){
        return query(params, "https://api.dropboxapi.com/2/users/get_current_account", "POST")
            .then((opts) => Promise.resolve(params))
            .catch((err) => Promise.reject({message: 'Dropbox didn\'t gave us access to your account', code: "NOT_AUTHENTICATED"}))
    },
    cat: function(path, params){
        return query_stream(params, "https://content.dropboxapi.com/2/files/download", "POST", null, {
            headers: {
                "Dropbox-API-Arg": JSON.stringify({path: path})
            }
        }).then((res) => {
            // dropbox send silly mimetype like 'application/octet-stream' for pdf files ...
            // We can't trust them on this, so we get rid of it. In our case, it will be set by the file controller
            const newRes = res.on('response', function(res) {
                delete res.headers['content-type'];
            });
            return Promise.resolve(newRes);
        })
    },
    ls: function(path, params){
        if(path === '/') path = '';
        return query(params, "https://api.dropboxapi.com/2/files/list_folder", "POST", {path: path, recursive: false, include_deleted: false, include_media_info: true})
            .then((res) => {
                let files = res.entries.map((file) => {
                    let tmp = {
                        size: file.size,
                        time: new Date(file.client_modified).getTime(),
                        type: file['.tag'] === 'file' ? 'file' : 'directory',
                        name: file.name
                    };
                    return tmp;
                });
                return Promise.resolve(files);
            });
    },
    write: function(path, content, params){
        return write_file(path, content, params);
    },
    rm: function(path, params){
        return query(params, "https://api.dropboxapi.com/2/files/delete_v2", "POST", {path: path})
            .then((res) => Promise.resolve('ok'));
    },
    mv: function(from, to, params){
        return query(params, "https://api.dropboxapi.com/2/files/move_v2", "POST", {from_path: from, to_path: to})
            .then((res) => verifyDropbox(res, to, params, 10))
            .catch(err => Promise.reject({message: JSON.parse(err).error, code: "DROPBOX_MOVE"}));
    },
    mkdir: function(path, params){
        path = path.replace(/\/$/, '');
        return query(params, "https://api.dropboxapi.com/2/files/create_folder_v2", "POST", {path: path, autorename: false})
            .then((res) => verifyDropbox(res, path, params, 10))
            .then((res) => Promise.resolve('ok'));
    },
    touch: function(path, params){
        var stream = new Readable(); stream.push(''); stream.push(null);
        return write_file(path, stream, params);
    }
}


function write_file(path, content, params){
    return process(path, content, params)
        .then((res) => retryOnError(res, path, content, params, 5))
        .then((res) => verifyDropbox(res, path, params, 10))

    function process(path, content, params){
        return query_stream(params, "https://content.dropboxapi.com/2/files/upload", "POST", content, {
            headers: {
                "Dropbox-API-Arg": JSON.stringify({
                    path: path,
                    autorename: false,
                    mode: "overwrite"
                }),
                "Content-Type": "application/octet-stream"
            }
        }).then(toString)
    }
    function retryOnError(body, path, content, params, n = 5){
        body = JSON.parse(body);
        if(body && body.error){
            return sleep(Math.abs(5 - n) * 1000)
                .then(() => process(path, content, params, n -1))
        }else{
            return Promise.resolve(body);
        }
    }
}



function verifyDropbox(keep, path, params, n = 10){
    let folder_path = Path.dirname(path).replace(/\/$/, '');
    if(folder_path === '.'){
        folder_path = '';
    }
    return sleep(Math.abs(10 - n) * 300)
        .then(() => query(params, "https://api.dropboxapi.com/2/files/list_folder", "POST", {path: folder_path, recursive: false, include_deleted: false, include_media_info: true}))
        .then((res) => {
            let found = res.entries.find((function(file){
                return file.path_display === path? true : false
            }));
            if(found){
                return Promise.resolve(keep)
            }else{
                if(n > 0){
                    return verifyDropbox(keep, path, params, n - 1)
                }else{
                    return Promise.reject({message: 'dropbox didn\' create the file or was taking too long to do so', code: 'DROPBOX_WRITE_ERROR'})
                }
            }
        })
}
function sleep(t=1000, arg){
    return new Promise((done) => {
        setTimeout(function(){
            done(arg);
        }, t)
    })
}
