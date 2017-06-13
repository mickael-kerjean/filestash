var bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    cors = require('cors'),
    config = require('../config'),
    express = require('express'),
    winston = require('winston'),
    expressWinston = require('express-winston');

var app = express();
app.disable('x-powered-by');

app.use(cookieParser());
app.use(bodyParser.json());

if(process.env.NODE_ENV === 'production'){
    app.use(expressWinston.logger({
        transports: [
            new winston.transports.Console({
                json: false,
                colorize: false
            })
        ],
        meta: false,
        exitOnError: false,
        msg: "HTTP {{res.statusCode}} {{req.method}} {{req.url}} {{res.responseTime}}ms",
        expressFormat: true,
        colorize: false,
        ignoreRoute: function (req, res) { return false; }
    }));
}

module.exports = app;
