import crypto from 'crypto';
const algorithm = 'aes-256-ctr';

export function encrypt(obj, key){
    const cipher = crypto.createCipher(algorithm, key);
    return cipher.update(JSON.stringify(obj), 'utf8', 'base64') + cipher.final('base64');
}


export function decrypt(text, key){
    var decipher = crypto.createDecipher(algorithm, key)
    return JSON.parse(decipher.update(text,'base64','utf8') + decipher.final('utf8'));
}
