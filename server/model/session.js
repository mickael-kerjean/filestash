var backend = {
    ftp: require('./backend/ftp'),
    sftp: require('./backend/sftp'),
    webdav: require('./backend/webdav'),
    dropbox: require('./backend/dropbox'),
    gdrive: require('./backend/gdrive'),
    s3: require('./backend/s3'),
    git: require('./backend/git')
};

exports.test = function(params){
    try{
        if(backend[params.type] && typeof backend[params.type].test === 'function'){
            return backend[params.type].test(params);
        }else{
            return error('not implemented');
        }
    }catch(err){
        return error(err);
    }
}

exports.auth = function(params){
    try{
        if(backend[params.type] && typeof backend[params.type].auth === 'function'){
            return backend[params.type].auth(params);
        }else{
            return error('not implemented');
        }
    }catch(err){
        return error(err);
    }
}

function error(message){
    return new Promise((done, err) => {
        err(message);
    });
}

