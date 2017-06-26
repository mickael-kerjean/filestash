module.exports = function(EXPIRE, REFRESH = 60000){
    let conn = {};

    setInterval(() => {
        for(let key in conn){
            if(conn[key] && conn[key].date + EXPIRE * 1000 > new Date().getTime()){
                file.rm(key).then(() => delete conn[key])
            }
        }
    }, REFRESH);
    
    return {
        get: function(key){
            if(conn[key] && new Date().getTime() > conn[key].date + CACHE_TIMEOUT * 1000){
                return conn[key].data;
            }
            return null;
        },
        put: function(key, data){
            conn[key] = {
                date: new Date(),
                data: data
            };
        }
    }
}
