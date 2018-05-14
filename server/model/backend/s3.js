// https://www.npmjs.com/package/aws-sdk
var AWS = require('aws-sdk');


function decode(path){
    let tmp = path.split('/');
    return {
        bucket: tmp.splice(0, 2)[1] || null,
        path: tmp.join('/')
    }
}

function connect(params){
    let config = {
        apiVersion: '2006-03-01',
        accessKeyId: params.access_key_id,
        secretAccessKey: params.secret_access_key,
        signatureVersion: 'v4',
        s3ForcePathStyle: true,
        //sslEnabled: true
    };
    if(params.endpoint){
        config.endpoint = new AWS.Endpoint(params.endpoint);
    }
    var s3 = new AWS.S3(config);
    return Promise.resolve(s3);
}

module.exports = {
    test: function(params){
        return connect(params)
            .then((s3) => {
                return new Promise((done, err) => {
                    s3.listBuckets(function(error, data) {
                        if(error){ err(error) }
                        else{ done(params) }
                    });
                });
            });
    },
    cat: function(path, params, res){
        path = decode(path);
        return connect(params)
            .then((s3) => {
                return Promise.resolve(s3.getObject({
                    Bucket: path.bucket,
                    Key: path.path
                }).on('httpHeaders', function (statusCode, headers) {
                    res.set('content-type', headers['content-type']);
                    res.set('content-length', headers['content-length']);
                    res.set('last-modified', headers['last-modified']);
                }).createReadStream())
            });
    },
    ls: function(path, params){
        if(/\/$/.test(path) === false) path += '/';
        path = decode(path);
        return connect(params)
            .then((s3) => {
                if(path.bucket === null){
                    return new Promise((done, err) => {
                        s3.listBuckets(function(error, data) {
                            if(error){ err(error) }
                            else{
                                let buckets = data.Buckets.map((bucket) => {
                                    return {
                                        name: bucket.Name,
                                        type: 'bucket',
                                        time: new Date(bucket.CreationDate).getTime(),
                                        can_read: true,
                                        can_delete: true,
                                        can_move: false
                                    }
                                });
                                buckets.push({type: 'metadata', name: './', can_create_file: false, can_create_directory: true});
                                done(buckets)
                            }
                        });
                    });
                }else{
                    return new Promise((done, err) => {
                        s3.listObjects({
                            Bucket: path.bucket,
                            Prefix: path.path,
                            Delimiter: '/'
                        }, function(error, data) {
                            if(error){ err(error) }
                            else{
                                let content = data.Contents
                                    .filter((file) => {
                                        return file.Key === path.path? false : true;
                                    })
                                    .map((file) => {
                                        return {
                                            type: 'file',
                                            size: file.Size,
                                            time: new Date(file.LastModified).getTime(),
                                            name: file.Key.split('/').pop()
                                        }
                                    });
                                let folders = data.CommonPrefixes.map((prefix) => {
                                    return {
                                        type: 'directory',
                                        size: 0,
                                        time: null,
                                        name: prefix.Prefix.split('/').slice(-2)[0]
                                    }
                                });
                                return done([].concat(folders, content));
                            }
                        });
                    });
                }
            });
    },
    write: function(path, stream, params){
        path = decode(path);
        return connect(params)
            .then((s3) => {
                return new Promise((done, err) => {
                    s3.upload({
                        Bucket: path.bucket,
                        Key: path.path,
                        Body: stream,
                        ContentLength: stream.byteCount
                    }, function(error, data) {
                        if(error){ err(error) }
                        else{
                            done('ok');
                        }
                    });
                });
            });
    },
    rm: function(path, params){
        path = decode(path);
        return connect(params)
            .then((s3) => {
                return new Promise((done, err) => {
                    s3.listObjects({
                        Bucket: path.bucket,
                        Prefix: path.path
                    }, function(error, obj){
                        if(error){ err(error); }
                        else{
                            Promise.all(obj.Contents.map((file) => {
                                return deleteObject(s3, path.bucket, file.Key)
                            })).then(function(){
                                if(path.path === ''){
                                    s3.deleteBucket({
                                        Bucket: path.bucket
                                    }, function(error){
                                        if(error){ err(error)}
                                        else{ done('ok'); }
                                    });
                                }else{
                                    done('ok');
                                }
                            })
                        }
                    })
                });                
            });

        function deleteObject(s3, bucket, key){
            return new Promise((done, err) => {
                s3.deleteObject({
                    Bucket: bucket,
                    Key: key
                }, function(error, data) {
                    if(error){ err(error) }
                    else{ done('ok') }
                });                        
            })
        }
    },
    mv: function(from, to, params){
        from = decode(from);
        to = decode(to);
     
        return connect(params)
            .then((s3) => {
                return new Promise((done, err) => {
                    s3.copyObject({
                        Bucket: to.bucket,
                        CopySource: from.bucket+'/'+from.path,
                        Key: to.path
                    }, function(error, data) {
                        if(error){ err(error) }
                        else{
                            s3.deleteObject({
                                Bucket: from.bucket,
                                Key: from.path
                            }, function(error){
                                if(error){ err(error) }
                                else{
                                    done('ok');
                                }
                            })
                        }
                    });
                });
            });
    },
    mkdir: function(path, params){
        if(/\/$/.test(path) === false) path += '/';
        path = decode(path);
        return connect(params)
            .then((s3) => {
                return new Promise((done, err) => {
                    if(path.path === ''){
                        s3.createBucket({
                            Bucket: path.bucket
                        }, function(error, data){
                            if(error){ err(error) }
                            else{ done('ok') }
                        });
                    }else{
                        s3.putObject({
                            Bucket: path.bucket,
                            Key: path.path
                        }, function(error, data) {
                            if(error){ err(error) }
                            else{ done('ok') }
                        });
                    }
                });
            })
    },
    touch: function(path, params){
        path = decode(path);
        return connect(params)
            .then((s3) => {
                return new Promise((done, err) => {
                    s3.putObject({
                        Bucket: path.bucket,
                        Key: path.path,
                        Body: ''
                    }, function(error, data) {
                        if(error){ err(error) }
                        else{ done('ok') }
                    });
                });
            })
    }
}
