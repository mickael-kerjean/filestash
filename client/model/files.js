"use strict";

import { http_get, http_post, prepare, basename, dirname } from '../helpers/';
import Path from 'path';

import { Observable } from 'rxjs/Observable';
import { cache } from '../helpers/';

class FileSystem{
    constructor(){
        this.obs = null;
        this.current_path = null;
    }

    ls(path, internal = false){
        this.current_path = path;
        this.obs && this.obs.complete();

        return Observable.create((obs) => {
            this.obs = obs;
            let keep_pulling_from_http = false;
            this._ls_from_cache(path, true)
                .then(() => {
                    const fetch_from_http = (_path) => {
                        return this._ls_from_http(_path)
                            .then(() => new Promise((done, err) => {
                                window.setTimeout(() => done(), 2000);
                            }))
                            .then(() => {
                                if(keep_pulling_from_http === false) return Promise.resolve();
                                return fetch_from_http(_path);
                            });
                    };
                    fetch_from_http(path);
                });

            return () => {
                keep_pulling_from_http = false;
            };
        });
    }

    _ls_from_http(path){
        const url = '/api/files/ls?path='+prepare(path);
        return http_get(url).then((response) => {
            return cache.get(cache.FILE_PATH, path, false).then((_files) => {
                if(_files && _files.results){
                    let _files_virtual_to_keep = _files.results.filter((file) => {
                        return file.icon === 'loading';
                    });
                    // update file results
                    for(let i=0; i<_files_virtual_to_keep.length; i++){
                        for(let j=0; j<response.results.length; j++){
                            if(response.results[j].name === _files_virtual_to_keep[i].name){
                                response.results[j] = Object.assign({}, _files_virtual_to_keep[i]);
                                _files_virtual_to_keep[i] = null;
                                break;
                            }
                        }
                    }
                    // add stuff that didn't exist in our response
                    _files_virtual_to_keep = _files_virtual_to_keep.filter((e) => e);
                    response.results = response.results.concat(_files_virtual_to_keep);
                }
                // publish
                cache.put(cache.FILE_PATH, path, {results: response.results});
                if(this.current_path === path) this.obs && this.obs.next({status: 'ok', results: response.results});
            });
        }).catch((_err) => {
            this.obs.next(_err);
            return Promise.reject();
        });
    }
    _ls_from_cache(path, _record_access = false){
        return cache.get(cache.FILE_PATH, path, _record_access).then((_files) => {
            if(_files && _files.results){
                if(this.current_path === path){
                    this.obs && this.obs.next({status: 'ok', results: _files.results});
                }
            };
            return Promise.resolve();
        });
    }

    rm(path){
        const url = '/api/files/rm?path='+prepare(path);
        return this._replace(path, 'loading')
            .then(() => http_get(url))
            .then((res) => {
                if(res.status === 'ok'){
                    cache.remove(cache.FILE_CONTENT, path, false);
                    cache.remove(cache.FILE_PATH, dirname(path), false);
                    return this._remove(path);
                }else{
                    return this._replace(path, 'error');
                }
            })
            .catch((err) => {
                this._replace(path, 'error');
                return Promise.reject(err);
            });
    }

    cat(path){
        const url = '/api/files/cat?path='+prepare(path);
        return http_get(url, 'raw')
            .then((res) => {
                if(is_binary(res) === false) cache.put(cache.FILE_CONTENT, path, {result: res});
                return Promise.resolve(res);
            })
            .catch((res) => {
                return cache.get(cache.FILE_CONTENT, path)
                    .then((_res) => {
                        if(!_res || !_res.result) return Promise.reject(res);
                        return Promise.resolve(_res.result);
                    })
                    .catch(() => Promise.reject(res));
            })
            .then((res) => {
                if(is_binary(res) === true) return Promise.reject({code: 'BINARY_FILE'});
                return Promise.resolve(res);
            });

        function is_binary(str){
            // Reference: https://en.wikipedia.org/wiki/Specials_(Unicode_block)#Replacement_character
            return /\ufffd/.test(str);
        }
    }
    url(path){
        const url = '/api/files/cat?path='+prepare(path);
        return Promise.resolve(url);
    }

    save(path, file){
        const url = '/api/files/cat?path='+prepare(path);
        let formData = new window.FormData();
        formData.append('file', file);
        return this._replace(path, 'loading')
            .then(() => cache.put(cache.FILE_CONTENT, path, file))
            .then(() => http_post(url, formData, 'multipart'))
            .then((res)=> res.status === 'ok'? this._replace(path) : this._replace(path, 'error'))
            .catch((err) => {
                this._replace(path, 'error');
                return Promise.reject(err);
            });
    }

    mkdir(path){
        const url = '/api/files/mkdir?path='+prepare(path);
        return this._add(path, 'loading')
            .then(() => this._add(path, 'loading'))
            .then(() => http_get(url))
            .then((res) => res.status === 'ok'? this._replace(path) : this._replace(path, 'error'))
            .catch((err) => {
                this._replace(path, 'error');
                return Promise.reject(err);
            });
    }

    touch(path, file){
        return this._add(path, 'loading')
            .then(() => {
                if(file){
                    const url = '/api/files/cat?path='+prepare(path);
                    let formData = new window.FormData();
                    formData.append('file', file);
                    return http_post(url, formData, 'multipart');
                }else{
                    const url = '/api/files/touch?path='+prepare(path);
                    return http_get(url);
                }
            })
            .then((res) => res.status === 'ok'? this._replace(path) : this._replace(path, 'error'))
            .catch((err) => {
                this._replace(path, 'error');
                return Promise.reject(err);
            });
    }

    mv(from, to){
        const url = '/api/files/mv?from='+prepare(from)+"&to="+prepare(to);

        return ui_before_request(from, to)
            .then(() => this._ls_from_cache(dirname(from)))
            .then(() => this._ls_from_cache(dirname(to)))
            .then(() => http_get(url).then((res) => {
                if(res.status === 'ok'){
                    return ui_when_success.call(this, from, to)
                        .then(() => this._ls_from_cache(dirname(from)))
                        .then(() => this._ls_from_cache(dirname(to)));
                }else{
                    return ui_when_fail.call(this, from, to)
                        .then(() => this._ls_from_cache(dirname(from)))
                        .then(() => this._ls_from_cache(dirname(to)));
                }
            }))
            .catch((err) => {
                ui_when_fail.call(this, from, to)
                    .then(() => this._ls_from_cache(dirname(from)))
                    .then(() => this._ls_from_cache(dirname(to)));
                return Promise.reject(err);
            });

        function ui_before_request(from, to){
            return update_from()
                .then((file) => {
                    if(dirname(from) !== dirname(to)){
                        return update_to(file);
                    }
                    return Promise.resolve();
                });

            function update_from(){
                return cache.get(cache.FILE_PATH, dirname(from), false)
                    .then((res_from) => {
                        let _file = {
                            name: basename(from),
                            type: /\/$/.test(from) ? 'directory' : 'file'
                        };
                        res_from.results = res_from.results.map((file) => {
                            if(file.name === basename(from)){
                                file.name = basename(to);
                                file.icon = 'loading';
                                _file = file;
                            }
                            return file;
                        });
                        return cache.put(cache.FILE_PATH, dirname(from), res_from)
                            .then(() => Promise.resolve(_file));
                    });
            }
            function update_to(file){
                return cache.get(cache.FILE_PATH, dirname(to), false).then((res_to) => {
                    if(!res_to || !res_to.results) return Promise.resolve();
                    res_to.results.push(file);
                    return cache.put(cache.FILE_PATH, dirname(to), res_to);
                });
            }
        }
        function ui_when_fail(from, to){
            return update_from()
                .then((file) => {
                    if(dirname(from) !== dirname(to)){
                        return update_to();
                    }
                    return Promise.resolve();
                });

            function update_from(){
                return cache.get(cache.FILE_PATH, dirname(from), false)
                    .then((res_from) => {
                        if(!res_from || !res_from.results) return Promise.reject();
                        res_from.results = res_from.results.map((file) => {
                            if(
                                (dirname(from) === dirname(to) && file.name === basename(to)) ||
                                    (dirname(from) !== dirname(to) && file.name === basename(from))
                            ){
                                file.icon = 'error';
                            }
                            return file;
                        });
                        return cache.put(cache.FILE_PATH, dirname(from), res_from)
                            .then(() => Promise.resolve());
                    });
            }

            function update_to(){
                return cache.get(cache.FILE_PATH, dirname(to), false)
                    .then((res_to) => {
                        if(!res_to || !res_to.results) return Promise.resolve();
                        res_to.results = res_to.results.filter((file) => {
                            if(file.name === basename(to)){
                                return false;
                            }
                            return true;
                        });
                        return cache.put(cache.FILE_PATH, dirname(from), res_to);
                    });
            }
        }
        function ui_when_success(from, to){
            if(dirname(from) === dirname(to)){
                return this._replace(dirname(from)+basename(to), null);
            }else{
                return update_from()
                    .then(update_to)
                    .then(update_related);
            }

            function update_from(){
                return cache.get(cache.FILE_PATH, dirname(from), false).then((res_from) => {
                    if(!res_from || !res_from.results) return Promise.resolve();
                    res_from.results = res_from.results.filter((file) => {
                        if(file.name === basename(to)){
                            return false;
                        }
                        return true;
                    });
                    return cache.put(cache.FILE_PATH, dirname(from), res_from);
                });
            }
            function update_to(){
                return cache.get(cache.FILE_PATH, dirname(to), false).then((res_to) => {
                    const target_already_exist = res_to && res_to.results ? true : false;
                    if(target_already_exist){
                        res_to.results = res_to.results.map((file) => {
                            if(file.name === basename(to)){
                                delete file.icon;
                            }
                            return file;
                        });
                        return cache.put(cache.FILE_PATH, dirname(to), res_to);
                    }else{
                        const data = {results: [{
                            name: basename(to),
                            type: /\/$/.test(to) ? 'directory' : 'file',
                            time: (new Date()).getTime()
                        }]};
                        return cache.put(cache.FILE_PATH, dirname(to), data);
                    }
                });
            }
            function update_related(){
                // manage nested directories when we try to rename a directory
                if(/\/$/.test(from) === true){
                    return cache.update_path((data) => {
                        if(data.path !== dirname(to) && data.path !== dirname(from) && data.path.indexOf(dirname(from)) === 0){
                            const old_path = data.path;
                            data.path = data.path.replace(dirname(from), dirname(to));
                            return cache.remove(cache.FILE_PATH, old_path)
                                .then(() => cache.put(cache.FILE_PATH, data.path, data));
                        }
                        return Promise.resolve();
                    });
                }
            }
        }
    }

    frequents(){
        let data = [];
        return cache.update_path((value) => {
            if(value.access_count >= 1 && value.path !== "/"){
                data.push(value);
            }
        }).then(() => {
            return Promise.resolve(
                data
                    .sort((a,b) => a.access_count > b.access_count? -1 : 1)
                    .map((a) => a.path)
                    .slice(0,6)
            );
        });
    }

    _replace(path, icon){
        return cache.get(cache.FILE_PATH, dirname(path), false)
            .then((res) => {
                if(!res) return Promise.resolve();
                let files = res.results.map((file) => {
                    if(file.name === basename(path)){
                        if(!icon){
                            delete file.icon;
                        }
                        if(icon){
                            file.icon = icon;
                        }
                    }
                    return file;
                });
                res.results = files;
                return cache.put(cache.FILE_PATH, dirname(path), res)
                    .then((res) => this._ls_from_cache(dirname(path)));
            });
    }

    _add(path, icon){
        return cache.get(cache.FILE_PATH, dirname(path), false)
            .then((res) => {
                if(!res) return Promise.resolve();
                let file = {
                    name: basename(path),
                    type: /\/$/.test(path) ? 'directory' : 'file'
                };
                if(icon) file.icon = icon;
                res.results.push(file);
                return cache.put(cache.FILE_PATH, dirname(path), res)
                    .then((res) => this._ls_from_cache(dirname(path)));
            });
    }
    _remove(path){
        return cache.get(cache.FILE_PATH, dirname(path), false)
            .then((res) => {
                if(!res) return Promise.resolve();
                let files = res.results.filter((file) => {
                    return file.name === basename(path) ? false : true;
                });
                res.results = files;
                return cache.put(cache.FILE_PATH, dirname(path), res)
                    .then((res) => this._ls_from_cache(dirname(path)));
            });
    }
}


export const Files = new FileSystem();
