import bcrypt from "bcryptjs";

const ROUND = 5;

export function bcrypt_password(password) {
    return new Promise((done, error) => {
        bcrypt.hash(password, ROUND, (err, hash) => {
            if (err) return error(err);
            done(hash);
        });
    });
}
