import Path from 'path';

export function pathBuilder(path, filename, type = 'file'){
    let tmp = Path.resolve(path, filename)
    if(type === 'file'){
        return tmp;
    }else{
        return tmp + '/';
    }
}
