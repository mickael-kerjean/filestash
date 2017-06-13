// https://www.dropbox.com/developers-v1/core/docs#oa2-authorize
var http = require('request-promise'),
    http_stream = require('request'),
    Path = require('path'),
    config = require('../../../config'),
    toString = require('stream-to-string');


function query(params, uri, method = 'GET', data){
    let opts = {
        headers: {
            'Authorization': 'Bearer '+params.bearer,
        },
        uri: uri,
        method: method
    };
    if(method === 'POST'){
        opts.form = data;
    }else if(method === 'PUT'){
        opts.body = data;
        opts.headers['Content-Length'] = data.length
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
function query_stream(params, uri, method = 'GET', data){
    let opts = {
        headers: {
            'Authorization': 'Bearer '+params.bearer,
        },
        uri: uri,
        method: method
    };
    if(method === 'POST'){
        opts.form = data;
    }else if(method === 'PUT'){
        opts.body = data;
        opts.headers['Content-Length'] = data.length
    }
    return Promise.resolve(http_stream(opts));
}

module.exports = {
    auth: function(params){
        let url = "https://www.dropbox.com/1/oauth2/authorize?client_id="+config.dropbox.clientID+"&response_type=token&redirect_uri="+config.dropbox.redirectURI+"&state=dropbox"
        return Promise.resolve(url)
    },
    test: function(params){
        return query(params, "https://api.dropboxapi.com/1/account/info")
            .then((opts) => Promise.resolve(params))
            .catch((err) => Promise.reject(err.response.body));
    },
    cat: function(path, params){
        return query_stream(params, "https://content.dropboxapi.com/1/files/auto/"+path)
    },
    ls: function(path, params){
        return query(params, "https://api.dropboxapi.com/1/metadata/auto/"+path)
            .then((res) => {
                let files = res.contents.map((file) => {
                    let tmp = {
                        size: file.bytes,
                        time: new Date(file.modified).getTime(),
                        type: file.is_dir? 'directory' : 'file',
                        name: file.path.split('/').slice(-1)[0]
                    };
                    if(file.read_only){
                        tmp.can_move = false;
                        tmp.can_delete = false;
                    }
                    return tmp;
                });
                if(res.read_only === true){
                    files.push({type: 'metadata', name: './', can_create_file: false, can_create_directory: false});
                }
                return Promise.resolve(files);
            })
    },
    write: function(path, content, params){
        return process(path, content, params)
            .then((res) => retryOnError(res, path, content, params, 5))
            .then((res) => verifyDropbox(res, path, params, 10))

        function process(path, content, params){
            return query_stream(params, "https://content.dropboxapi.com/1/files_put/auto/"+path, "PUT", content)
                .then(toString)
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
        function verifyDropbox(keep, path, params, n = 10){
            return sleep(Math.abs(10 - n) * 300)
                .then(() => query(params, "https://api.dropboxapi.com/1/metadata/auto/"+Path.dirname(path)))
                .then((res) => {
                    let found = res.contents.find((function(file){
                        return file.path === path? true : false
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
    },
    rm: function(path, params){
        return query(params, "https://api.dropboxapi.com/1/fileops/delete", "POST", {root: 'auto', path: path})
            .then((res) => Promise.resolve('ok'))
    },
    mv: function(from, to, params){
        return query(params, "https://api.dropboxapi.com/1/fileops/move", "POST", {root: 'auto', from_path: from, to_path: to})
            .catch(err => Promise.reject({message: JSON.parse(err).error, code: "DROPBOX_MOVE"}))
    },
    mkdir: function(path, params){
        return query(params, "https://api.dropboxapi.com/1/fileops/create_folder", "POST", {root: 'auto', path: path})
            .then((res) => Promise.resolve('ok'))
    },
    touch: function(path, params){
        return query(params, "https://content.dropboxapi.com/1/files_put/auto/"+path, "PUT", '')
            .then((res) => Promise.resolve('ok'));
    }
}
