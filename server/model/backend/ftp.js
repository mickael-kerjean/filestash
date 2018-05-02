var FtpClient = require("ftp");

// connections are reused to make things faster and avoid too much problems
const connections = {};
setInterval(() => {
    for(let key in connections){
        if(connections[key].date + (1000*120) < new Date().getTime()){
            connections[key].conn.end();
            delete connections[key];
        }
    }
}, 5000);

function connect(params){
    if(connections[JSON.stringify(params)]){
        connections[JSON.stringify(params)].date = new Date().getTime();
        return Promise.resolve(connections[JSON.stringify(params)].conn);
    }else{
        let c = new FtpClient();
        c.connect({
            host: params.hostname,
            port: params.port || 21,
            user: params.username,
            password: params.password
        });
        return new Promise((done, err) => {
            c.on('ready', function(){
                clearTimeout(timeout);
                done(c);
                connections[JSON.stringify(params)] = {
                    date: new Date().getTime(),
                    conn: c
                }
            });
            c.on('error', function(error){
                err(error)
            })
            // because of: https://github.com/mscdex/node-ftp/issues/187
            let timeout = setTimeout(() => {
                err('timeout');
            }, 5000);
        });
    }
}

module.exports = {
    test: function(params){
        return connect(params)
            .then(() => Promise.resolve(params))
    },
    cat: function(path, params){
        return connect(params)
            .then((c) => {
                return new Promise((done, err) => {
                    c.get(path, function(error, stream) {
                        if (error){ err(error); }
                        else{ done(stream); }
                    });
                });
            });
    },
    ls: function(path, params){
        return connect(params)
            .then((c) => {
                return new Promise((done, err) => {
                    c.list(path, function(error, list) {
                        if(error){ err(error) }
                        else{
                            list = list
                                .map(el => {
                                    return {
                                        size: el.size,
                                        time: new Date(el.date).getTime(),
                                        name: el.name,
                                        type: function(t){
                                            if(t === '-'){
                                                return 'file';
                                            }else if(t === 'd'){
                                                return 'directory';
                                            }else if(t === 'l'){
                                                return 'link';
                                            }
                                        }(el.type),
                                        can_read: null,
                                        can_write: null,
                                        can_delete: null,
                                        can_move: null
                                    }
                                })
                                .filter(el => {
                                    return el.name === '.' || el.name === '..' ? false : true
                                });
                            done(list);
                        }
                    })
                })
            })
    },
    write: function(path, content, params){
        return connect(params)
            .then((c) => {
                return new Promise((done, err) => {
                    c.put(content, path, function(error){
                        if (error){ err(error)}
                        else{ done('ok'); }
                    });
                });
            })
    },
    rm: function(path, params){
        return connect(params)
            .then((c) => {
                return new Promise((done, err) => {
                    c.delete(path, function(error){
                        if(error){
                            c.rmdir(path, true, function(error){
                                if(error) { err(error) }
                                else{ done('ok dir'); }
                            });
                        }
                        else{ done('ok'); }
                    });
                });
            });
    },
    mv: function(from, to, params){
        return connect(params)
            .then((c) => {
                return new Promise((done, err) => {
                    c.rename(from, to, function(error){
                        if(error){ err(error) }
                        else{ done('ok') }
                    });
                });
            });
    },
    mkdir: function(path, params){
        return connect(params)
            .then((c) => {
                return new Promise((done, err) => {
                    c.mkdir(path, function(error){
                        if(error){ err(error) }
                        else{ done('ok') }
                    });
                });
            });
    },
    touch: function(path, params){
        return connect(params)
            .then((c) => {
                return new Promise((done, err) => {
                    c.put(Buffer.from(''), path, function(error){
                        if (error){ err(error)}
                        else{ done('ok'); }
                    });
                });
            });
    }
}


