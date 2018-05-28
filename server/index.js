var app = require('./bootstrap'),
    express = require('express'),
    filesRouter = require('./ctrl/files'),
    sessionRouter = require('./ctrl/session');


app.get('/api/ping', function(req, res){ res.send('pong')})
app.use('/api/files', filesRouter)
app.use('/api/session', sessionRouter);
app.use('/', express.static(__dirname + '/public/'))
app.use('/*', function (req, res){
    res.sendFile(__dirname + '/public/index.html')
});

var server = app.listen(process.env.PORT || 8334, function(err){
    if(err){ console.log(err); }
    else{console.log("Server running on port: %d", server.address().port);}
});
