const crypto = require('crypto'),
    algorithm = 'aes-256-cbc',
    password = require('../../config.js')['server_secret'];

module.exports = {
    encrypt: function(obj){
        obj.date = new Date().getTime();
        const text = JSON.stringify(obj);
        const cipher = crypto.createCipher(algorithm, password);
        let crypted = cipher.update(text, 'utf8', 'base64');
        crypted += cipher.final('base64');
        return crypted;
    },
    decrypt: function(text){
        var dec;
        try{
            const decipher = crypto.createDecipher(algorithm, password);
            dec = decipher.update(text, 'base64', 'utf8');
            dec += decipher.final('utf8');
            dec = JSON.parse(dec);
        }catch(err){
            dec = null;
        }
        return dec;
    }
}
