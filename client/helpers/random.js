export function gid(prefix){
    let id = prefix !== undefined ? prefix : '';
    id += new Date().getTime().toString(32);
    id += parseInt(Math.random()*Math.pow(10,16)).toString(32);
    return id;
}

const alphabet = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p",
                  "q","r","s","t","u","v","x","y","z","A","B","C","D","E","F","G",
                  "H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W",
                  "X","Y","Z","0","1","2","3","4","5","6","7","8","9"];
const alphabet_size = alphabet.length;

export function randomString(size = 16){
    let str = "";
    for(let i=0; i<size; i++){
        str += alphabet[Math.floor(Math.random()*alphabet_size)]
    }
    return str;
}
