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
    const path = pathBuilder(req);
    if(path){
        Files
            .ls(path, req.cookies.auth)
            .then(function(results){ res.send({status: 'ok', results: results}); })
            .catch(function(err){ errorHandler(res, err, 'cannot fetch files'); });
    }else{
        res.send({status: 'error', message: 'unknown path'});
    }
});

// get a file content
app.get('/cat', function(req, res){
    const path = pathBuilder(req);
    res.clearCookie("download");
    if(path){
        Files.cat(path, req.cookies.auth, res)
            .then(function(stream){
                stream = stream.on('error', function (error) {
                    let status = 404;
                    if(error && typeof error.status === "number"){
                        status = error.status;
                    }
                    res.status(status).send({status: status, message: "There's nothing here"});
                    if(typeof this.end ===  "function") this.end();
                });
                res.set('Content-Type',  mime.getMimeType(path));
                stream.pipe(res);
            })
            .catch(function(err){ errorHandler(res, err, 'couldn\'t read the file'); });
    }else{
        res.send({status: 'error', message: 'unknown path'});
    }
});

// create/update a file
// https://github.com/pillarjs/multiparty
app.post('/cat', function(req, res){
    const form = new multiparty.Form(),
          path = pathBuilder(req);

    if(path){
        form.on('part', function(part) {
            part.on('error', function(err){
                errorHandler(res, {code: "INTERNAL_ERROR", message: "internal error"}, 'internal error');
            });

            Files.write(path, part, req.cookies.auth)
                .then(function(result){
                    res.send({status: 'ok'});
                })
                .catch(function(err){ errorHandler(res, err, 'couldn\'t write the file'); });
        });
        form.parse(req);
    }else{
        res.send({status: 'error', message: 'unknown path'});
    }
});

// rename a file/directory
app.get('/mv', function(req, res){
    req.query.path = req.query.from;
    const from = pathBuilder(req);
    req.query.path = req.query.to;
    const to = pathBuilder(req)

    if(from === to){
        res.send({status: 'ok'});
    }else if(from && to){
        Files.mv(from, to, req.cookies.auth)
            .then(function(message){ res.send({status: 'ok'}); })
            .catch(function(err){ errorHandler(res, err, 'couldn\'t rename your file'); });
    }else{
        res.send({status: 'error', message: 'unknown path'});
    }
});

// delete a file/directory
app.get('/rm', function(req, res){
    const path = pathBuilder(req);
    if(path){
        Files.rm(path, req.cookies.auth)
            .then(function(message){ res.send({status: 'ok'}); })
            .catch(function(err){ errorHandler(res, err, 'couldn\'t delete your file'); });
    }else{
        res.send({status: 'error', message: 'unknown path'});
    }
});

// create a directory
app.get('/mkdir', function(req, res){
    const path = pathBuilder(req);
    if(path){
        Files.mkdir(path, req.cookies.auth)
            .then(function(message){ res.send({status: 'ok'}); })
            .catch(function(err){ errorHandler(res, err, 'couldn\'t create the directory'); });
    }else{
        res.send({status: 'error', message: 'unknown path'});
    }
});

app.get('/touch', function(req, res){
    const path = pathBuilder(req);
    if(path){
        Files.touch(path, req.cookies.auth)
            .then(function(message){ res.send({status: 'ok'}); })
            .catch(function(err){ errorHandler(res, err, 'couldn\'t create the file'); });
    }else{
        res.send({status: 'error', message: 'unknown path'});
    }
});


module.exports = app;

function pathBuilder(req){
    return path.posix.join(req.cookies.auth.payload.path || '', decodeURIComponent(req.query.path) || '');
}

function errorHandler(res, err, defaultMessage){
    const code = {
        "INTERNAL_ERROR": {message: "Oops, it seems we had a problem", status: 500},
        "ECONNREFUSED": {message: "Oops, the service you are connected on is not available", status: 502}
    };
    const status = function(_code, _status){
        if(code[_code]){
            return code[_code]['status'];
        }
        _status = parseInt(_status);
        if(_status >= 400 && _status < 600){
            return _status;
        }
        return 404;
    }(err.code || err.errno, err.status);

    if(code[err.code || err.errno]){
        res.status(status).send({
            status: 'error',
            message: code[err.code]['message']
        });
    }else if(err.message){
        res.status(status).send({
            status: 'error',
            message: err.message || 'cannot fetch files',
            trace: err
        });
    }else{
        res.status(status).send({
            status: 'error',
            message: defaultMessage,
            trace: err
        });
    }
}
