import Path from 'path';

export function pathBuilder(path, filename, type = 'file'){
    let tmp = Path.resolve(path, filename)
    if(type === 'file'){
        return tmp;
    }else{
        return tmp + '/';
    }
}

export function basename(path){
    return Path.basename(path);
}

export function dirname(path){
    const dir = Path.dirname(path);
    if(dir === '/') return dir;
    return dir + "/";
}
