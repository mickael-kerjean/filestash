import aesjs from "aes-js";

export function encrypt(obj, key){
    const textBytes = aesjs.utils.utf8.toBytes(JSON.stringify(obj));
    const keyBytes = aesjs.padding.pkcs7.pad(aesjs.utils.utf8.toBytes(key));
    return aesjs.utils.hex.fromBytes(
        new aesjs.ModeOfOperation.ctr(keyBytes, new aesjs.Counter(5)).encrypt(textBytes)
    );
}

export function decrypt(text, key){
    const textBytes = aesjs.utils.hex.toBytes(text);
    const keyBytes = aesjs.padding.pkcs7.pad(aesjs.utils.utf8.toBytes(key));
    return JSON.parse(aesjs.utils.utf8.fromBytes(
        new aesjs.ModeOfOperation.ctr(keyBytes, new aesjs.Counter(5)).decrypt(textBytes)
    ));
}

