var app = require('./bootstrap'),
    express = require('express'),
    filesRouter = require('./ctrl/files'),
    sessionRouter = require('./ctrl/session');


app.get('/ping', function(req, res){ res.send('pong')})
app.use('/api/files', filesRouter)
app.use('/api/session', sessionRouter);
app.use('/', express.static(__dirname + '/public/'))
app.use('/*', function (req, res){
    res.sendFile(__dirname + '/public/index.html')
});

app.listen(3000, function(err){
    if(err){ console.log(err); }
    else{ console.log("Running at Port 3000"); }
});
