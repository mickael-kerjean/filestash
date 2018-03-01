var Client = require('ssh2-sftp-client');

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
        let sftp = new Client();
        let opts = {host: params.host, port: params.port || 22, username: params.username};
        if(params.hasOwnProperty('private_key') && params['private_key']){
            opts.privateKey = params['private_key']
        }else{
            opts.password = params['password'];
        }
        return sftp.connect(opts).then((res) => {
            connections[JSON.stringify(params)] = {
                date: new Date().getTime(),
                conn: sftp
            }
            return Promise.resolve(sftp)
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
            .then((sftp) => sftp.get(path, false, null));
    },
    ls: function(path, params){
        return connect(params)
            .then((sftp) => sftp.list(path))
            .then((res) => Promise.resolve(res.map((file) => {
                return {
                    type: function(type){
                        if(type === 'd'){
                            return 'directory'
                        }else if(type === 'l'){
                            return 'link';
                        }else if(type === '-'){
                            return 'file';
                        }else{
                            return 'unknown';
                        }
                    }(file.type),
                    name: file.name,
                    size: file.size,
                    time: file.modifyTime
                };
            })));
    },
    write: function(path, content, params){
        return connect(params)
            .then((sftp) => sftp.put(content, path))
    },
    rm: function(path, params){
        return connect(params)
            .then((sftp) => {
                return sftp.delete(path)
                    .catch((err) => sftp.rmdir(path, true))
            });
    },
    mv: function(from, to, params){
        return connect(params)
            .then((sftp) => sftp.rename(from, to));
    },
    mkdir: function(path, params){
        return connect(params)
            .then((sftp) => sftp.mkdir(path, false))
    },
    touch: function(path, params){
        return connect(params)
            .then((sftp) => sftp.put(Buffer.from(''), path))
    }
}
