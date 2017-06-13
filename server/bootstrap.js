var bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    cors = require('cors'),
    config = require('../config'),
    express = require('express'),
    winston = require('winston'),
    expressWinston = require('express-winston');
    
require('winston-couchdb');

var app = express();
app.enable('trust proxy')
app.disable('x-powered-by');

app.use(cookieParser());
app.use(bodyParser.json());

if(process.env.NODE_ENV === 'production'){
    var transports = [
        new winston.transports.Console({
            json: false,
            colorize: false
        })
    ];
    if(config.info.usage_stats === true){
        transports.push(new winston.transports.Couchdb({
            host: 'log.kerjean.me',
            db: 'log_nuage',
            port: 443,
            ssl: true,
        }));
    }
    app.use(expressWinston.logger({
        transports: transports,
        requestWhitelist: [],
        responseWhitelist: [],
        meta: true,
        exitOnError: false,
        msg: "HTTP {{res.statusCode}} {{req.method}} {{req.url}} {{res.responseTime}}ms",
        expressFormat: true,
        colorize: false,
        ignoreRoute: function (req, res) {
            return /^\/api\//.test(req.originalUrl)? false : true;
        },
        dynamicMeta: function(req, res) {
            return {
                host: req.hostname,
                protocol: req.protocol,
                method:req.method,
                pathname: req.originalUrl,
                ip: req.ip,
                referrer: req.get('Referrer'),
                status: res.statusCode,
            }
        }
    }));
}

module.exports = app;
