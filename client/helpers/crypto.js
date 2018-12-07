import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const algorithm = 'aes-256-cbc';

export function encrypt(obj, key){
    const cipher = crypto.createCipher(algorithm, key);
    return cipher.update(JSON.stringify(obj), 'utf8', 'base64') + cipher.final('base64');
}


export function decrypt(text, key){
    var decipher = crypto.createDecipher(algorithm, key)
    return JSON.parse(decipher.update(text,'base64','utf8') + decipher.final('utf8'));
}

export function bcrypt_password(password) {
    return new Promise((done, error) => {
        bcrypt.hash(password, 10, (err, hash) => {
            if(err) return error(err)
            done(hash);
        })
    });
}
