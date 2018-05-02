export function gid(prefix){
    let id = prefix !== undefined ? prefix : '';
    id += new Date().getTime().toString(32);
    id += parseInt(Math.random()*Math.pow(10,16)).toString(32);
    return id;
}
