const gitclient = require("nodegit"),
      toString = require('stream-to-string'),
      crypto = require('crypto'),
      fs = require('fs'),
      Readable = require('stream').Readable,
      Path = require('path');

module.exports = {
    test: function(params){
        if(!params || !params.repo){ return Promise.reject({message: 'invalid authentication', code: 'INVALID_PARAMS'}) };
        if(!params.commit) params.commit = "{action}({filename}): {path}"
        if(!params.branch) params.branch = 'master';
        if(!params.author_name) params.author_name = "Nuage";
        if(!params.author_email) params.author_email = "https://nuage.kerjean.me";
        if(!params.committer_name) params.committer_name = "Nuage";
        if(!params.committer_email) params.committer_email = "https://nuage.kerjean.me";

        if(params.password && params.password.length > 2700){
            return Promise.reject({message: "Your password couldn\'t fit in a cookie :/", code: "COOKIE_ERROR"})
        }
        return git.clone(params);
    },
    cat: function(path, params){
        return file.cat(Path.join(path_repo(params), path));
    },
    ls: function(path, params){
        return file.ls(Path.join(path_repo(params), path))
            .then((files) => files.filter((file) => (file.name === '.git' && file.type === 'directory') ? false: true))
    },
    write: function(path, content, params){
        return file.write(Path.join(path_repo(params), path), content)
            .then(() => git.save(params, path, "write"));
    },
    rm: function(path, params){
        return file.rm(Path.join(path_repo(params), path))
            .then(() => git.save(params, path, "delete"));
    },
    mv: function(from, to, params){
        return file.mv(Path.join(path_repo(params), from), Path.join(path_repo(params), to))
            .then(() => git.save(params, to, 'move'));
    },
    mkdir: function(path, params){
        return file.mkdir(Path.join(path_repo(params), path));
    },
    touch: function(path, params){
        var stream = new Readable(); stream.push(''); stream.push(null);
        return file.write(Path.join(path_repo(params), path), stream)
            .then(() => git.save(params, path, 'create'));
    }
}


function path_repo(obj){
    let hash = crypto.createHash('md5').update('git_');
    for(let key in obj){
        if(typeof obj[key] === 'string'){
            hash.update(obj[key]);
        }
    }
    return "/tmp/"+hash.digest('hex');
}

const file = {};
file.write = function (path, stream){
    return new Promise((done, err) => {
        let writer = fs.createWriteStream(path, { flags : 'w' });
        stream.pipe(writer);
        writer.on('close', function(){
            done('ok');
        });
        writer.on('error', function(error){
            err(error);
        });
    });
};
file.mkdir = function(path){
    return new Promise((done, err) => {
        fs.mkdir(path, function(error){
            if(error){ return err(error); }
            return done("ok");
        });
    });
}
file.mv = function(from, to){
    return new Promise((done, err) => {
        fs.rename(from, to, function(error){
            if(error){ return err(error); }
            return done("ok");
        });
    });    
}
file.ls = function(path){
    return new Promise((done, err) => {
        fs.readdir(path, (error, files) => {
            if(error){ return err(error); }                        
            Promise.all(files.map((file) => {
                return stats(Path.join(path, file)).then((stat) => {                    
                    stat.name = file;
                    return Promise.resolve(stat);
                });
            })).then((files) => {
                done(files.map((file) => {
                    return {
                        size: file.size,
                        time: new Date(file.mtime).getTime(),
                        name: file.name,
                        type: file.isFile()? 'file' : 'directory'
                    };
                }));
            }).catch((error) => err(error));
        });
    });

    function stats(path){
        return new Promise((done, err) => {
            fs.stat(path, function(error, res){
                if(error) return err(error);
                return done(res);
            });
        });
    }
}
file.rm = function(path){
    return rm(path);
    
    function rm(path){
        return stat(path).then((_stat) => {
            if(_stat.isDirectory()){
                return ls(path)
                    .then((files) => Promise.all(files.map(file => rm(Path.join(path, file)))))
                    .then(() => removeEmptyFolder(path));
            }else{
                return removeFileOrLink(path);
            }
        });
    }
    
    function removeEmptyFolder(path){
        return new Promise((done, err) => {
            fs.rmdir(path, function(error){
                if(error){ return err(error); }
                return done("ok");
            });
        });
    }
    function removeFileOrLink(path){
        return new Promise((done, err) => {
            fs.unlink(path, function(error){
                if(error){ return err(error); }
                return done("ok");
            });
        });
    }
    function ls(path){
        return new Promise((done, err) => {
            fs.readdir(path, function (error, files) {
                if(error) return err(error)
                return done(files)
            });
        });
    }
    function stat(path){
        return new Promise((done, err) => {
            fs.stat(path, function (error, _stat) {
                if(error){ return err(error); }
                return done(_stat);
            });
        });
    }
}

file.cat = function(path){
    return Promise.resolve(fs.createReadStream(path));
}


const git = {};
git.clone = function(params, alreadyExist = false){
    return new Promise((done, err) => {
        gitclient.Clone(params.repo, path_repo(params), {fetchOpts: { callbacks: { credentials: git_creds.bind(null, params) }}})
            .then((repo) => pull(repo, params.branch))
            .then(() => done(params))
            .catch((error) => {
                if(error.errno === -4){
                    return gitclient.Repository.open(path_repo(params))
                        .then((repo) => {
                            return pull(repo, params.branch)
                                .then(() => _refresh(repo, params.branch, params))
                        })
                        .then(() => done(params))
                        .catch((error) => {
                            err({code: error && error.errno? "GIT_ERR"+error.errno : "GIT_ERR" , message: error && error.message || "can\'t clone the repo" });
                        });
                }
                return err({code: error && error.errno? "GIT_ERR"+error.errno : "GIT_ERR" , message: error && error.message || "can\'t clone the repo" });
            });
    })

    function pull(repo, branch){
        return repo.getBranchCommit("origin/"+params.branch)
            .then((commit) => {
                return repo.createBranch(params.branch, commit)
                    .catch(() => Promise.resolve())
            })
            .then(() => repo.checkoutBranch(params.branch));
    }
}

function _refresh(repo, branch, params){
    return repo.fetchAll({callbacks: { credentials: git_creds.bind(null, params) }})
        .then(() => repo.mergeBranches(branch, "origin/"+branch, gitclient.Signature.default(repo), 2))
        .catch(err => {
            if(err.errno === -13){
                return git.save(params, '', 'merge')
                    .then(() => _refresh(repo, branch, params))
            }
            return Promise.reject(err);
        })
}
git.save = function(params, path = '', type = ''){
    let data = {repo: null, commit: null, index: null, oid: null}
    const author = gitclient.Signature.now(params.author_name, params.author_email);
    const committer = gitclient.Signature.now(params.committer_name, params.committer_email);
    const message = params.commit
          .replace("{action}", type)
          .replace("{dirname}", Path.dirname(path))
          .replace("{filename}", Path.basename(path))
          .replace("{path}", path || '');
    
    return new Promise((done, err) => {
        gitclient.Repository.open(path_repo(params))
            .then((repo) => {
                data.repo = repo;
                return repo.getBranchCommit(params.branch)
            })
            .then((commit) => {
                data.commit = commit;
                return commit.repo.refreshIndex();
            })
            .then((index) => {
                data.index = index;
                return index.addAll();
            })
            .then(() => data.index.write())
            .then(() => data.index.writeTree())
            .then((oid) => data.repo.createCommit("HEAD", author, committer, message, oid, [data.commit]))
            .then((commit) => data.repo.getRemote("origin"))
            .then((remote) => remote.push(["refs/heads/"+params.branch+":refs/heads/"+params.branch], { callbacks: { credentials: git_creds.bind(null, params) }}))
            .then((ok) => done(ok))
            .catch((error) => {
                err(error)
            });
    });
}
function git_creds(params, url, username){
    const user = username? username : params.username;
    if(/http[s]?\:\/\//.test(url)){
        return gitclient.Cred.userpassPlaintextNew(username, params.password);
    }else{
        return gitclient.Cred.sshKeyMemoryNew(username, "", params.password, params.passphrase || "")
    }
            
}
