export function gid(prefix = "") {
    let id = prefix;
    id += new Date().getTime().toString(32);
    id += Math.random().toString(32).replace(/^0\./, "");
    return id;
}
