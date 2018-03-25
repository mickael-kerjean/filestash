var fs = require("webdav-fs");
var Readable = require('stream').Readable;
var toString = require('stream-to-string');

function connect(params){
    return fs(
        params.url,
        params.username,
        params.password
    );
}

module.exports = {
    test: function(params){
        return new Promise((done, err) => {
            connect(params).readFile('/', function(error, res){
                if(error){ err(error); }
                else{ done(params); }
            });
        });
    },
    cat: function(path, params){
        return Promise.resolve(connect(params).createReadStream(path));
    },
    ls: function(path, params){
        return new Promise((done, err) => {
            connect(params).readdir(path, function(error, contents) {
                if (!error) {
                    done(contents.map((content) => {
                        return {
                            name: content.name,
                            type: function(cont){
                                if(cont.isDirectory()){
                                    return 'directory';
                                }else if(cont.isFile()){
                                    return 'file'
                                }else{
                                    return null;
                                }
                            }(content),
                            time: content.mtime,
                            size: content.size
                        }
                    }));
                } else {
                    err(error);
                }
            }, 'stat');
        });
    },
    write: function(path, content, params){
        return Promise.resolve(content.pipe(connect(params).createWriteStream(path)));
    },
    rm: function(path, params){
        return new Promise((done, err) => {
            connect(params).unlink(path, function (error) {
                if(error){ err(error); }
                else{ done('ok'); }
            });
        });
    },
    mv: function(from, to, params){
        return new Promise((done, err) => {
            connect(params).rename(from, to, function (error) {
                if(error){ err(error); }
                else{ done('ok'); }
            });
        });
    },
    mkdir: function(path, params){
        return new Promise((done, err) => {
            connect(params).mkdir(path, function(error) {
                if(error){ err(error); }
                else{ done('done'); }
            });
        });
    },
    touch: function(path, params){
        return new Promise((done, err) => {
            connect(params).writeFile(path, '', function(error) {
                if(error){ err(error); }
                else{ done('done'); }
            });
        });
    }
}
