var app = require('./bootstrap'),
    express = require('express'),
    filesRouter = require('./ctrl/files'),
    sessionRouter = require('./ctrl/session'),
    fs = require('fs');


app.get('/api/ping', function(req, res){ res.send('pong')})
app.use('/api/files', filesRouter)
app.use('/api/session', sessionRouter);
app.use('/', express.static(__dirname + '/public/'))
app.use('/*', function (req, res){
    fs.createReadStream(__dirname + '/public/index.html').pipe(res);
});

app.listen(8334, function(err){
    if(err){ console.log(err); }
    else{ console.log("Running: http://127.0.0.1:8334"); }
});
