var crypto = require('crypto'),
    algorithm = 'aes-256-ctr',
    password = process.env.SECRET_KEY || '123';

module.exports = {
    encrypt: function(obj){
        obj.date = new Date().getTime();
        let text = JSON.stringify(obj);
        var cipher = crypto.createCipher(algorithm,password)
        var crypted = cipher.update(text,'utf8','hex')
        crypted += cipher.final('hex');
        return crypted;
    },
    decrypt: function(text){
        var dec;
        try{
            var decipher = crypto.createDecipher(algorithm,password)
            dec = decipher.update(text,'hex','utf8')
            dec += decipher.final('utf8');
            dec = JSON.parse(dec);
        }catch(err){
            dec = {};
        }
        return dec;
    }
}
