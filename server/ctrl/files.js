var express = require('express'),
    app = express.Router(),
    path = require('path'),
    crypto = require('../utils/crypto'),
    Files = require('../model/files'),
    multiparty = require('multiparty'),
    mime = require('../utils/mimetype.js');

app.use(function(req, res, next){
    req.cookies.auth = crypto.decrypt(req.cookies.auth);
    if(req.cookies.auth !== null){
        return next();
    }else{
        return res.status(401).send({status: "error", message: "You need to authenticate first"});
    }
});


// list files
app.get('/ls', function(req, res){
    let path = pathBuilder(req);
    if(path){
        Files
            .ls(path, req.cookies.auth)
            .then(function(results){
                res.send({status: 'ok', results: results});
            })
            .catch(function(err){
                res.send({status: 'error', message: err.message || 'cannot fetch files', trace: err});
            });
    }else{
        res.send({status: 'error', message: 'unknown path'});
    }
});

// get a file content
app.get('/cat', function(req, res){
    let path = pathBuilder(req);
    res.clearCookie("download");
    if(path){
        Files.cat(path, req.cookies.auth, res)
            .then(function(stream){
                res.set('Content-Type',  mime.getMimeType(path));
                stream.pipe(res);
            })
            .catch(function(err){
                res.send({status: 'error', message: err.message || 'couldn\t read the file', trace: err});
            });
    }else{
        res.send({status: 'error', message: 'unknown path'});
    }
});

// create/update a file
// https://github.com/pillarjs/multiparty
app.post('/cat', function(req, res){
    var form = new multiparty.Form(),
        path = pathBuilder(req);

    if(path){
        form.on('part', function(part) {
            part.on('error', function(err){
                res.send({status: 'error', message: 'internal error'});
            });

            Files.write(path, part, req.cookies.auth)
                .then(function(result){
                    res.send({status: 'ok'});
                })
                .catch(function(err){
                    res.send({status: 'error', message: err.message || 'couldn\'t write the file', code: err.code});
                });
        });
        form.parse(req);
    }else{
        res.send({status: 'error', message: 'unknown path'});
    }
});

// rename a file/directory
app.get('/mv', function(req, res){
    let from = decodeURIComponent(req.query.from),
        to = decodeURIComponent(req.query.to);

    if(from === to){
        res.send({status: 'ok'});
    }else if(from && to){
        Files.mv(from, to, req.cookies.auth)
            .then((message) => {
                res.send({status: 'ok'});
            })
            .catch((err) => {
                res.send({status: 'error', message: err.message || 'couldn\'t rename your file', trace: err});
            });
    }else{
        res.send({status: 'error', message: 'unknown path'});
    }
});

// delete a file/directory
app.get('/rm', function(req, res){
    let path = pathBuilder(req);
    if(path){
        Files.rm(path, req.cookies.auth)
            .then((message) => {
                res.send({status: 'ok'});
            })
            .catch((err) => {
                res.send({status: 'error', message: err.message || 'couldn\'t delete your file', trace: err});
            });
    }else{
        res.send({status: 'error', message: 'unknown path'});
    }
});

// create a directory
app.get('/mkdir', function(req, res){
    let path = pathBuilder(req);
    if(path){
        Files.mkdir(path, req.cookies.auth)
            .then((message) => {
                res.send({status: 'ok'});
            })
            .catch((err) => {
                res.send({status: 'error', message: err.message || 'couldn\'t create a directory', trace: err});
            });
    }else{
        res.send({status: 'error', message: 'unknown path'});
    }
});

app.get('/touch', function(req, res){
    let path = pathBuilder(req);
    if(path){
        Files.touch(path, req.cookies.auth)
            .then((message) => {
                res.send({status: 'ok'});
            })
            .catch((err) => {
                res.send({status: 'error', message: err.message || 'couldn\'t create a file', trace: err});
            });
    }else{
        res.send({status: 'error', message: 'unknown path'});
    }
});


module.exports = app;

function pathBuilder(req){
    return path.join(req.cookies.auth.payload.path || '', decodeURIComponent(req.query.path) || '');
}
