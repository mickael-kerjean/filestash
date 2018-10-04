export function leftPad(str, length, pad = "0"){
    if(typeof str !== 'string' || typeof pad !== 'string' || str.length >= length || !pad.length > 0) return str;
    return leftPad(pad + str, length, pad);
}

export function copyToClipboard (str){
    if(!str) return
    let $input = document.createElement("input");
    $input.setAttribute("type", "text");
    $input.setAttribute("style", "position: absolute; top:0;left:0;background:red")
    $input.setAttribute("display", "none");
    document.body.appendChild($input);
    $input.value = str;
    $input.select();
    document.execCommand("copy");
    $input.remove();
}
