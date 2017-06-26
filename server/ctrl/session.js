var express = require('express'),
    app = express.Router(),
    crypto = require('../utils/crypto'),
    Session = require('../model/session'),
    http = require('request-promise');

app.get('/', function(req, res){
    let data = crypto.decrypt(req.cookies.auth);
    if(data.type){
        res.send({status: 'ok', result: true})
    }else{
        res.send({status: 'ok', result: false})
    }
});

app.post('/', function(req, res){    
    Session.test(req.body)
        .then((state) => {
            let persist = {
                type: req.body.type,
                payload: state
            };
            const cookie = crypto.encrypt(persist);
            if(Buffer.byteLength(cookie, 'utf-8') > 4096){
                res.send({status: 'error', message: 'we can\'t authenticate you', })
            }else{
                res.cookie('auth', crypto.encrypt(persist), { maxAge: 365*24*60*60*1000, httpOnly: true });
                res.send({status: 'ok', result: 'pong'});
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
            res.send({status: 'error', message: message(err), code: err.code});
        });
});

app.delete('/', function(req, res){
    res.clearCookie("auth");
    res.send({status: 'ok'})
});

app.get('/auth/:id', function(req, res){
    Session.auth({type: req.params.id})
        .then((url) => {
            res.send({status: 'ok', result: url})
        })
        .catch((err) => {
            res.send({status: 'error', message: 'can\'t get authorization url', trace: err})
        });
});

module.exports = app;
