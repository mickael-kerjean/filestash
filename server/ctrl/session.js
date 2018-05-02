var express = require('express'),
    app = express.Router(),
    crypto = require('../utils/crypto'),
    Session = require('../model/session'),
    http = require('request-promise');

app.get('/', function(req, res){
    let data = crypto.decrypt(req.cookies.auth);
    if(data && data.type){
        res.send({status: 'ok', result: true})
    }else{
        res.send({status: 'ok', result: false})
    }
});

app.post('/', function(req, res){
    Session.test(req.body)
        .then((state) => {
            if(!state.path) state.path = "";
            else{ state.path = state.path.replace(/\/$/, ''); }
            let persist = {
                type: req.body.type,
                payload: state
            };
            const cookie = crypto.encrypt(persist);
            if(Buffer.byteLength(cookie, 'utf-8') > 4096){
                res.status(413).send({status: 'error', message: 'we can\'t authenticate you'})
            }else{
                res.cookie('auth', crypto.encrypt(persist), { maxAge: 365*24*60*60*1000, httpOnly: true, path: "/api/" });
                res.send({status: 'ok'});
            }
        })
        .catch((err) => {
            let message = function(err){
                let t = err && err.message || 'could not establish a connection';
                if(err.code){
                    t += ' ('+err.code+')';
                }
                return t;
            }
            res.status(401).send({status: 'error', message: message(err), code: err.code});
        });
});

app.delete('/', function(req, res){
    res.clearCookie("auth", {path: "/api/"});

    // TODO in May 2019: remove the line below which was inserted to mitigate a cookie migration issue.
    res.clearCookie("auth"); // the issue was a change in the cookie path which would have make
                             // impossible for an existing user to logout
    res.send({status: 'ok'});
});

app.get('/auth/:id', function(req, res){
    Session.auth({type: req.params.id})
        .then((url) => {
            res.send({status: 'ok', result: url});
        })
        .catch((err) => {
            res.status(404).send({status: 'error', message: 'can\'t get authorization url', trace: err});
        });
});

module.exports = app;
