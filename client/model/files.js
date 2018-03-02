import { http_get, http_post, invalidate, prepare } from '../helpers/';
import Path from 'path';

class FileSystem{
    ls(path, cache = 120){
        let url = '/api/files/ls?path='+prepare(path);
        invalidate(path)
        return http_get(url, cache);
    }

    rm(path){
        let url = '/api/files/rm?path='+prepare(path);
        invalidate_ls(path), false;
        invalidate_cat(path, false);
        return http_get(url);
    }

    mv(from, to){
        let url = '/api/files/mv?from='+prepare(from)+"&to="+prepare(to);
        invalidate_ls(from);
        invalidate_ls(to);
        invalidate_cat(from);
        return http_get(url);
    }

    cat(path, cache = 60){
        let url = '/api/files/cat?path='+prepare(path);
        return http_get(url, cache, 'raw')
    }
    url(path){
        let url = '/api/files/cat?path='+prepare(path);
        return Promise.resolve(url);
    }

    save(path, file){
        invalidate_ls(path);
        invalidate_cat(path);
        let url = '/api/files/cat?path='+prepare(path);
        let formData = new FormData();
        formData.append('file', file);
        return http_post(url, formData, 'multipart');
    }

    mkdir(path){
        let url = '/api/files/mkdir?path='+prepare(path);
        invalidate_ls(path);
        return http_get(url);
    }

    touch(path, file){
        invalidate_ls(path);
        if(file){
            let url = '/api/files/cat?path='+prepare(path);
            let formData = new FormData();
            formData.append('file', file);
            return http_post(url, formData, 'multipart');
        }else{
            let url = '/api/files/touch?path='+prepare(path);
            return http_get(url)
        }
    }
}

function invalidate_ls(path, exact = true){
    let url = '/api/files/ls?path='.replace(/([^a-zA-Z0-9])/g, '\\$1');
    let reg = new RegExp(url + prepare(Path.dirname(path)+'.*'));
    return invalidate(reg);
}
function invalidate_cat(path, exact = true){
    let url = '/api/files/cat?path='.replace(/([^a-zA-Z0-9])/g, '\\$1');
    let reg = new RegExp(url + prepare(path)+ (exact? '' : '.*'));
    return invalidate(reg);
}

export const Files = new FileSystem();
