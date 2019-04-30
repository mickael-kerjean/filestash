import bcrypt from 'bcryptjs';

export function bcrypt_password(password){
    return new Promise((done, error) => {
        bcrypt.hash(password, 10, (err, hash) => {
            if(err) return error(err)
            done(hash);
        })
    });
}
