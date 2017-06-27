import crypto from 'crypto';
const algorithm = 'aes-256-ctr';

export function encrypt(obj, key){
    const cipher = crypto.createCipher(algorithm, key);
    return cipher.update(JSON.stringify(obj), 'utf8', 'hex') + cipher.final('hex');
}


export function decrypt(text, key){
    var decipher = crypto.createDecipher(algorithm, key)
    try{
        return JSON.parse(decipher.update(text,'hex','utf8') + decipher.final('utf8'));
    }catch(err){
        return {}
    }
}
