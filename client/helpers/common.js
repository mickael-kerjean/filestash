export function leftPad(str, length, pad = "0"){
    if(typeof str !== 'string' || typeof pad !== 'string' || str.length >= length || !pad.length > 0) return str;
    return leftPad(pad + str, length, pad);
}
