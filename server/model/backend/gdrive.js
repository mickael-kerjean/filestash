// https://developers.google.com/drive/v3/web/quickstart/nodejs
// https://developers.google.com/apis-explorer/?hl=en_GB#p/drive/v3/
var google = require('googleapis'),
    googleAuth = require('google-auth-library'),
    config = require('../../../config'),
    Stream = require('stream');

var client = google.drive('v3');


function findMimeType(filename){
    let ext = filename.split('.').slice(-1)[0];
    let list = {
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        xml: 'text/xml',
        ods: 'application/vnd.oasis.opendocument.spreadsheet',
        csv: 'text/csv',
        tmpl: 'text/plain',
        org: 'text/plain',
        md: 'text/plain',
        pdf:  'application/pdf',
        php: 'application/x-httpd-php',
        jpg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        bmp: 'image/bmp',
        txt: 'text/plain',
        text: 'text/plain',
        conf: 'text/plain',
        log: 'text/plain',
        doc: 'application/msword',
        js: 'text/js',
        swf: 'application/x-shockwave-flash',
        mp3: 'audio/mpeg',
        zip: 'application/zip',
        rar: 'application/rar',
        tar: 'application/tar',
        arj: 'application/arj',
        cab: 'application/cab',
        html: 'text/html',
        htm: 'text/html'
    };
    return list[ext] || 'application/octet-stream';
}


function decode(path){
    let tmp = path.trim().split('/');
    let filename = tmp.pop() || null;
    tmp.shift();
    return {
        name: filename,
        parents: tmp,
        full: filename === null ? tmp : [].concat(tmp, [filename])
    };
}

function findId(auth, _folders, ids = []){
    const folders = JSON.parse(JSON.stringify(_folders));
    const name = folders.pop();

    return search(auth, name, folders)
        .then((files) => {
            let solutions = findSolutions(files, ids);
            let aggregatedSolution = [].concat(solutions, ids);
            if(solutions.length === 0){
                return Promise.reject({message: 'this path doesn\'t exist', code: 'UNKNOWN_PATH'});
            }else if(solutions.length === 1){
                return Promise.resolve(findFolderId(solutions[0], ids));
            }else{
                return findId(auth, folders, aggregatedSolution);
            }
        });

    function search(_auth, _name, _folders){
        if(_name === undefined){
            return findRoot(_auth);
        }else{
            return findByName(_auth, _name, _folders.length + 1);
        }
    }

    function findRoot(auth){
        return new Promise((_done,_err) => {
            client.files.list({
                auth: auth,
                q: "'root' in parents",
                pageSize: 1,
                fields: "files(parents, id, name)"
            }, function(error, response){
                if(error){_err(error);}
                else{
                    if(response.files.length > 0){
                        _done(response.files.map((file) => {
                            return {
                                level: 0,
                                id: file.parents[0],
                                name: 'root'
                            };
                        }));
                    }else{
                        _done([{
                            level: 0,
                            id: 'root',
                            name: 'root'
                        }]);
                    }
                }
            });
        });
    }

    function findByName(auth, name, _level){
        return new Promise((_done,_err) => {
            client.files.list({
                auth: auth,
                q: "name = '"+name+"' AND trashed = false",
                pageSize: 500,
                fields: "files(parents, id, name)"
            }, function(error, response){
                if(error){_err(error);}
                else{
                    _done(response.files.map((file) => {
                        file.level = _level;
                        return file;
                    }));
                }
            });
        });
    }

    function findFolderId(head, cache, result = 'root'){
        for(let i=0, l=cache.length; i<l; i++){
            if(head.id === cache[i].parents[0] && head.level + 1 === cache[i].level){
                return findFolderId(cache[i], cache);
            }
        }
        return head.id;
    }

    function findSolutions(newFiles, cache){
        return newFiles.filter((newFile) => {
            if(cache.length === 0){ return true;}
            for(let i=0, j=cache.length; i<j; i++){
                if(newFile.id === cache[i].parents[0] && (newFile.level + 1) === cache[i].level){
                    return true;
                }
            }
            return false;
        });
    }
}

function authorize(params){
    var auth = new googleAuth(),
        client_id = config.gdrive.clientID,
        client_secret = config.gdrive.clientSecret,
        redirect_uri = config.gdrive.redirectURI;

    var oauth2Client = new auth.OAuth2(client_id, client_secret, redirect_uri);
    return Promise.resolve(oauth2Client);
}
function connect(params){
    return authorize(params)
        .then((auth) => {
            return new Promise((done, err) => {
                if(params && params.access_token){
                    auth.credentials = params;
                    done(auth);
                }else if(params && params.code){
                    auth.getToken(params.code, function(error, token) {
                        if(error){ err(error); }
                        else{
                            auth.credentials = token;
                            done(auth);
                        }
                    });
                }else{
                    err({message: 'can\'t connect without auth code or token', code: 'INVALID_CONNECTION'});
                }
            });

            return Promise.resolve(auth);
        });
}

module.exports = {
    auth: function(params){
        return authorize()
            .then((auth) => {
                return Promise.resolve(auth.generateAuthUrl({
                    access_type: 'online',
                    scope: [ "https://www.googleapis.com/auth/drive" ]
                }));
            });
    },
    test: function(params){
        return connect(params)
            .then((auth) => {
                return new Promise((done, err) => {
                    client.files.list({
                        auth: auth,
                        q: "'root' in parents AND mimeType = 'application/vnd.google-apps.folder'",
                        pageSize: 5,
                        fields: "files(parents)"
                    }, function(error, response) {
                        if(error){ err(error); }
                        else{ done(auth.credentials); }
                    });
                });
            });
    },
    cat: function(path, params){
        path = decode(path);
        return connect(params)
            .then((auth) => {
                return findId(auth, path.full)
                    .then((id) => fileInfo(auth, id))
                    .then((file) => {
                        if(/application\/vnd.google-apps/.test(file.mimeType)){
                            let type = 'text/plain';
                            if(file.mimeType === 'application/vnd.google-apps.spreadsheet'){
                                type = 'text/csv';
                            }
                            return exporter(auth, file.id, type);
                        }else{
                            return download(auth, file.id);
                        }
                    });
            });

        function fileInfo(auth, id){
            return new Promise((done, err) => {
                client.files.get({
                    auth: auth,
                    fileId: id
                },function(error, response){
                    if(error){ err(error); }
                    else{ done(response); }
                });
            });
        }
        function download(auth, id){
            var content = '';
            return Promise.resolve(client.files.get({
                auth: auth,
                fileId: id,
                alt: 'media'
            }));
        }
        function exporter(auth, id, type){
            var content = '';
            return new Promise((done, err) => {
                done(client.files.export({
                    auth: auth,
                    fileId: id,
                    mimeType: type
                }));
            });
        }
    },
    ls: function(_path, params){
        path = decode(_path);
        return connect(params)
            .then((auth) => {
                return findId(auth, path.parents)
                    .then((id) => findDrive(auth, id))
                    .then(parse);
            });

        function findDrive(auth, id){
            return new Promise((done, err) => {
                client.files.list({
                    spaces: path.space,
                    auth: auth,
                    q: "'"+id+"' in parents AND trashed = false",
                    pageSize: 500,
                    fields: "files(id,mimeType,modifiedTime,name,size)"
                }, function(error, response) {
                    if(error){ err(error); }
                    else{ done(response.files); }
                });
            });
        }
        function parse(files){
            return Promise.resolve(files.map((file) => {
                return {
                    type: file.mimeType === 'application/vnd.google-apps.folder'? 'directory' : 'file',
                    name: file.name,
                    size: file.hasOwnProperty('size')? Number(file.size) : 0,
                    time: new Date(file.modifiedTime).getTime()
                };
            }));
        }
    },
    write: function(path, content, params){ // TODO
        path = decode(path);
        return connect(params)
            .then((auth) => {
                return fileAlreadyExist(auth, path)
                    .then((obj) => {
                        if(obj.alreadyExist === true){
                            return updateFile(auth, content, path.name, obj.id);
                        }
                        if(obj.alreadyExist === false){
                            return createFile(auth, content, path.name, obj.id);
                        }
                    });
            });

        function fileAlreadyExist(auth, path){
            return findId(auth, path.full)
                .then((id) => Promise.resolve({alreadyExist: true, id: id}))
                .catch((err) => {
                    return findId(auth, path.parents)
                        .then((id) => Promise.resolve({alreadyExist: false, id: id}))
                });
        }

        function createFile(_auth, _stream, _filename, _folderId){
            return new Promise((done, err) => {
                client.files.create({
                    auth: _auth,
                    fields: 'id',
                    media: {
                        mimeType: 'text/plain',
                        body: _stream
                    },
                    resource: {
                        name: _filename,
                        parents: [_folderId]
                    }
                }, function(error){
                    if(error) {err(error); }
                    else{ done('ok'); }
                });
            });
        }
        function updateFile(_auth, _stream, _filename, _folderId){
            return new Promise((done, err) => {
                client.files.update({
                    auth: _auth,
                    fileId: _folderId,
                    fields: 'id',
                    media: {
                        mimeType: findMimeType(_filename),
                        body: _stream
                    }
                }, function(error){
                    if(error) {err(error); }
                    else{ done('ok'); }
                })
            });
        }

    },
    rm: function(path, params){
        path = decode(path);
        return connect(params)
            .then((auth) => {
                return findId(auth, path.full)
                    .then((id) => {
                        return new Promise((done, err) => {
                            client.files.delete({
                                fileId: id,
                                auth: auth
                            }, function(error){
                                if(error){ err(error); }
                                else{ done('ok'); }
                            })
                        });
                    });
            });
    },
    mv: function(from, to, params){
        from = decode(from);
        to = decode(to);
        return connect(params)
            .then((auth) => {
                return Promise.all([findId(auth, from.full), findId(auth, from.parents), findId(auth, to.parents)])
                    .then((res) => process(auth, res));
            });

        function wait(res){
            return new Promise((done) => {
                setTimeout(function(){
                    done(res);
                }, 500);
            });
        }
        function process(auth, res){
            let fileId = res[0],
                srcId = res[1],
                destId = res[2];
            let fields = 'id';
            let params = {fileId, fileId, auth: auth};

            if(destId !== srcId){
                fields += ', parents';
                params.addParents = destId;
                params.removeParents = srcId;
            }
            if(to.name !== null && from.name !== null && from.name !== to.name ){
                fields += 'name';
                params.resource = {
                    name: to.name
                };
            }
            return new Promise((done, err) => {
                client.files.update(params, function(error, response){
                    if(error){ err(error); }
                    else{ done('ok'); }
                });
            });
        }
    },
    mkdir: function(path, params){
        path = decode(path);
        return connect(params)
            .then((auth) => {
                return findId(auth, path.parents.slice(0, -1))
                    .then((folder) => {
                        return new Promise((done, err) => {
                            client.files.create({
                                fields: 'id',
                                auth: auth,
                                resource: {
                                    name: path.parents.slice(-1)[0],
                                    parents: [folder],
                                    mimeType: 'application/vnd.google-apps.folder'
                                }
                            }, function(error){
                                if(error) {err(error); }
                                else{ done(auth); }
                            });
                        });
                    });
            })
            .then((auth) => verifyFolderCreation(auth, path.full));

        function verifyFolderCreation(_auth, _path, n = 10){
            return sleep(Math.abs(10 - n) * 100)
                .then(() => findId(_auth, _path))
                .catch((err) => {
                    if(n > 0 && err && err.code === 'UNKNOWN_PATH'){
                        return verifyFolderCreation(_auth, _path, n - 1);
                    }
                    return Promise.reject(err);
                });

            function sleep(t=1000, arg){
                return new Promise((done) => {
                    setTimeout(function(){
                        done(arg);
                    }, t);
                });
            }
        }
        function copy(obj){
            return JSON.parse(JSON.stringify(obj));
        }
    },
    touch: function(path, params){
        path = decode(path);
        var readable = new Stream.Readable();
        readable.push('');
        readable.push(null);

        return connect(params)
            .then((auth) => {
                return findId(auth, path.parents)
                    .then((folder) => {
                        return new Promise((done, err) => {
                            client.files.create({
                                auth: auth,
                                fields: 'id',
                                media: {
                                    mimeType: 'text/plain',
                                    body: readable
                                },
                                resource: {
                                    name: path.name,
                                    parents: [folder]
                                }
                            }, function(error){
                                if(error) {err(error); }
                                else{ done('ok'); }
                            });
                        });
                    });
            });
    }
};
