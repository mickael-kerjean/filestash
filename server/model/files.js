var backend = {
    ftp: require('./backend/ftp'),
    sftp: require('./backend/sftp'),
    webdav: require('./backend/webdav'),
    dropbox: require('./backend/dropbox'),
    gdrive: require('./backend/gdrive'),
    s3: require('./backend/s3'),
    git: require('./backend/git')
};
    
exports.cat = function(path, params, res){
    try{
        if(backend[params.type] && typeof backend[params.type].cat === 'function'){
            return backend[params.type].cat(path, params.payload, res);
        }else{
            return error('not implemented');
        }
    }catch(err){
        return error(err);
    }
}

exports.write = function(path, content, params){
    try{
        if(backend[params.type] && typeof backend[params.type].write === 'function'){        
            return backend[params.type].write(path, content, params.payload);
        }else{
            return error('not implemented');
        }
    }catch(err){
        return error(err);
    }
}

exports.ls = function(path, params){
    try{
        if(backend[params.type] && typeof backend[params.type].ls === 'function'){
            return backend[params.type].ls(path, params.payload);
        }else{
            return error('not implemented');
        }
    }catch(err){
        return error(err);
    }
}

exports.mv = function(from, to, params){
    try{
        if(backend[params.type] && typeof backend[params.type].mv === 'function'){        
            return backend[params.type].mv(from, to, params.payload);
        }else{
            return error('not implemented');
        }
    }catch(err){
        return error(err);
    }
}

exports.rm = function(path, params){
    try{
        if(backend[params.type] && typeof backend[params.type].rm === 'function'){
            return backend[params.type].rm(path, params.payload);
        }else{
            return error('not implemented');
        }
    }catch(err){
        return error(err);
    }
}

exports.mkdir = function(path, params){
    try{
        if(backend[params.type] && typeof backend[params.type].mkdir === 'function'){
            return backend[params.type].mkdir(path, params.payload);
        }else{
            return error('not implemented');
        }
    }catch(err){
        return error(err);
    }
}

exports.touch = function(path, params){
    try{
        if(backend[params.type] && typeof backend[params.type].touch === 'function'){
            return backend[params.type].touch(path, params.payload);
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
