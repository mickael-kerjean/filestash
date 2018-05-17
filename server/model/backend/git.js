const gitclient = require("nodegit"),
      toString = require('stream-to-string'),
      fs = require('fs'),
      Readable = require('stream').Readable,
      Path = require('path'),
      crypto = require("crypto"),
      BASE_PATH = "/tmp/";

let repos = {};
setInterval(() => autoVacuum, 1000*60*60*10);

module.exports = {
    test: function(params){
        if(!params || !params.repo){ return Promise.reject({message: 'invalid authentication', code: 'INVALID_PARAMS'}) };
        if(!params.commit) params.commit = "{action} ({filename}): {path}";
        if(!params.branch) params.branch = 'master';
        if(!params.author_name) params.author_name = "Nuage";
        if(!params.author_email) params.author_email = "https://nuage.kerjean.me";
        if(!params.committer_name) params.committer_name = "Nuage";
        if(!params.committer_email) params.committer_email = "https://nuage.kerjean.me";

        if(params.password && params.password.length > 2700){
            return Promise.reject({message: "Your password couldn\'t fit in a cookie :/", code: "COOKIE_ERROR"})
        }
        return git.open(params)
            .then(() => Promise.resolve(params));
    },
    cat: function(path, params){
        return git.open(params)
            .then((repo) => git.refresh(repo, params))
            .then(() => file.cat(calculate_path(params, path)));
    },
    ls: function(path, params){
        return git.open(params)
            .then((repo) => git.refresh(repo, params))
            .then(() => file.ls(calculate_path(params, path)))
            .then((files) => files.filter((file) => (file.name === '.git' && file.type === 'directory') ? false: true))
    },
    write: function(path, content, params){
        return git.open(params)
            .then(() => file.write(calculate_path(params, path), content))
            .then(() => git.save(params, path, "write"));
    },
    rm: function(path, params){
        return git.open(params)
            .then(() => file.rm(calculate_path(params, path)))
            .then(() => git.save(params, path, "delete"));
    },
    mv: function(from, to, params){
        return git.open(params)
            .then(() => file.mv(calculate_path(params, from), calculate_path(params, to)))
            .then(() => git.save(params, to, 'move'));
    },
    mkdir: function(path, params){
        return git.open(params)
            .then(() => file.mkdir(calculate_path(params, path)))
            .then(() => git.save(params, path, "create"))
    },
    touch: function(path, params){
        var stream = new Readable(); stream.push(''); stream.push(null);
        return git.open(params)
            .then(() => file.write(calculate_path(params, path), stream))
            .then(() => git.save(params, path, 'create'));
    }
};

function autoVacuum(){
    const MAXIMUM_DATE_BEFORE_CLEAN = new Date().getTime() - 1000*60*60*24;
    for(let repo_path in repos){
        if(repos[repo_path] > MAXIMUM_DATE_BEFORE_CLEAN){
            fs.unlink(repo_path);
            delete repos[repo_path];
        }
    }
}

function calculate_path(params, path){
    const repo = path_repo(params);
    const full_path = Path.posix.join(repo, path);
    if(full_path.indexOf(BASE_PATH) !== 0 || full_path === BASE_PATH){
        return BASE_PATH+"error";
    }
    return full_path;
}

function path_repo(obj){
    let hash = crypto.createHash('md5');
    for(let key in obj){
        if(typeof obj[key] === 'string'){
            hash.update(obj[key]);
        }
    }
    const path = BASE_PATH+"git_"+obj.uid+"_"+obj.repo.replace(/[^a-zA-Z]/g, "")+"_"+hash.digest('hex');
    repos[path] = new Date().getTime();
    return path;
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
                return stats(path+file).then((stat) => {
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
                    .then((files) => Promise.all(files.map(file => rm(path+file))))
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
git.open = function(params){
    count = 0;
    return gitclient.Repository.open(path_repo(params))
        .catch((err) => {
            return gitclient.Clone(params.repo, path_repo(params), {fetchOpts: { callbacks: { credentials: git_creds.bind(null, params) }}})
                .then((repo) => {
                    const branch = params.branch;
                    return repo.getBranchCommit("origin/"+branch)
                        .catch(() => repo.getHeadCommit("origin"))
                        .then((commit) => {
                            return repo.createBranch(branch, commit)
                                .then(() => repo.checkoutBranch(branch))
                                .then(() => Promise.resolve(repo));
                        })
                        .catch(() => Promise.resolve(repo));
                });
        });
};

git.refresh = function(repo, params){
    count = 0;
    return repo.fetchAll({callbacks: { credentials: git_creds.bind(null, params) }})
        .then(() => repo.mergeBranches(params.branch, "origin/"+params.branch, gitclient.Signature.default(repo), 2))
        .catch(err => {
            if(err.errno === -13){
                return git.save(params, '', 'merge')
                    .then(() => git.refresh(repo, params))
                    .then(() => Promise.resolve(repo));
            }
            return Promise.resolve(repo);
        });
};

git.save = function(params, path = '', type = ''){
    count = 0;
    const author = gitclient.Signature.now(params.author_name, params.author_email);
    const committer = gitclient.Signature.now(params.committer_name, params.committer_email);
    const message = params.commit
          .replace("{action}", type)
          .replace("{dirname}", Path.posix.dirname(path))
          .replace("{filename}", Path.posix.basename(path))
          .replace("{path}", path || '');

    return git.open(params)
        .then((repo) => Promise.all([
            Promise.resolve(repo),
            getParent(repo, params),
            refresh(repo, params)
        ]))
        .then((data) => {
            const [repo, commit, oid] = data;
            const parents = commit ? [commit] : [];
            return repo.createCommit("HEAD", author, committer, message, oid, parents)
                .then(() => Promise.resolve(repo));
        })
        .then((repo) => {
            return repo.getRemote("origin")
                .then((remote) => {
                    return remote.push(
                        ["refs/heads/"+params.branch+":refs/heads/"+params.branch],
                        { callbacks: { credentials: git_creds.bind(null, params, true) }}
                    );
                })
                .catch((err) => Promise.reject({status: 403, message: "Not authorized to push"}));
        });

    function getParent(repo, params){
        return repo.getBranchCommit(params.branch)
            .catch(() => {
                return repo.getHeadCommit()
                    .catch(() => Promise.resolve(null));
            });
    }
    function refresh(repo, params){
        return repo.refreshIndex()
            .then((index) => {
                return index.addAll()
                    .then(() => index.write())
                    .then(() => index.writeTree());
            });
    }
};





// the count thinghy is used to see if the request succeeded or not
// when something fail, nodegit would just run the callback again and again.
// The only way to make it throw an error is to return the defaultNew thinghy
let count = 0;
function git_creds(params, fn, _count){
    count += 1;

    if(count > 1 && _count !== undefined){
        return new gitclient.Cred.defaultNew();
    }else if(/http[s]?\:\/\//.test(params.repo)){
        return new gitclient.Cred.userpassPlaintextNew(params.username, params.password);
    }else{
        return new gitclient.Cred.sshKeyMemoryNew(params.username, "", params.password, params.passphrase || "")
    }
}
