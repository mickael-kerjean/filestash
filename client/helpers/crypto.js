import Aesjs from "aes-js";

export function encrypt(obj, key) {
    const textBytes = Aesjs.utils.utf8.toBytes(JSON.stringify(obj));
    const keyBytes = Aesjs.padding.pkcs7.pad(Aesjs.utils.utf8.toBytes(key));
    return Aesjs.utils.hex.fromBytes(
        new Aesjs.ModeOfOperation.ctr(keyBytes, new Aesjs.Counter(5)).encrypt(textBytes),
    );
}

export function decrypt(text, key) {
    const textBytes = Aesjs.utils.hex.toBytes(text);
    const keyBytes = Aesjs.padding.pkcs7.pad(Aesjs.utils.utf8.toBytes(key));
    return JSON.parse(Aesjs.utils.utf8.fromBytes(
        new Aesjs.ModeOfOperation.ctr(keyBytes, new Aesjs.Counter(5)).decrypt(textBytes),
    ));
}
