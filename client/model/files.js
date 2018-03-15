"use strict";

import { http_get, http_post, prepare } from '../helpers/';
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
            this._ls_from_cache(path);

            let keep_pulling_from_http = false;
            const fetch_from_http = (_path) => {
                return this._ls_from_http(_path)
                    .then(() => new Promise((done, err) => {
                        window.setTimeout(() => done(), 2000);
                    }))
                    .then(() => {
                        return keep_pulling_from_http === true? fetch_from_http(_path) : Promise.resolve();
                    });
            };
            fetch_from_http(path);

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
                    let _files_virtual_to_keep = _files.results.filter((file) => file.icon === 'loading');
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
                if(this.current_path === path) this.obs && this.obs.next(response.results);
            });
        }).catch((_err) => {
            // TODO: user is in offline mode, notify
            console.log(_err);
        });
    }
    _ls_from_cache(path){
        return cache.get(cache.FILE_PATH, path).then((_files) => {
            if(_files && _files.results){
                if(this.current_path === path){
                    this.obs && this.obs.next(_files.results);
                }
            };
            return Promise.resolve();
        });
    }

    rm(path){
        const url = '/api/files/rm?path='+prepare(path);
        this._replace(path, 'loading');
        return http_get(url)
            .then((res) => {
                if(res.status === 'ok'){
                    this._remove(path);
                    cache.remove(cache.FILE_CONTENT, path, false);
                    cache.remove(cache.FILE_PATH, Path.dirname(path) + "/", false);
                }else{
                    this._replace(path, 'error');
                }
            });
    }

    cat(path){
        const url = '/api/files/cat?path='+prepare(path);
        return http_get(url, 'raw')
            .then((res) => cache.put(cache.FILE_CONTENT, path, {result: res}))
            .catch((res) => {
                return cache.get(cache.FILE_CONTENT, path)
                    .then((_res) => {
                        if(!_res || !_res.result) return Promise.reject(_res);
                        return Promise.resolve(_res.result);
                    })
                    .catch(() => Promise.reject(res));
            });
    }
    url(path){
        const url = '/api/files/cat?path='+prepare(path);
        return Promise.resolve(url);
    }

    save(path, file){
        const url = '/api/files/cat?path='+prepare(path);
        let formData = new window.FormData();
        formData.append('file', file);
        this._replace(path, 'loading');
        cache.put(cache.FILE_CONTENT, path, file);
        return http_post(url, formData, 'multipart')
            .then((res)=> {
                res.status === 'ok'? this._replace(path) : this._replace(path, 'error');
                return Promise.resolve(res);
            });
    }

    mkdir(path){
        const url = '/api/files/mkdir?path='+prepare(path);
        this._add(path, 'loading');
        cache.remove(cache.FILE_PATH, Path.dirname(path) + "/");
        return http_get(url)
            .then((res) => {
                return res.status === 'ok'? this._replace(path) : this._replace(path, 'error');
            });
    }

    touch(path, file){
        this._add(path, 'loading');
        let req;
        if(file){
            const url = '/api/files/cat?path='+prepare(path);
            let formData = new window.FormData();
            formData.append('file', file);
            req = http_post(url, formData, 'multipart');
        }else{
            const url = '/api/files/touch?path='+prepare(path);
            req = http_get(url);
        }

        return req
            .then((res) => {
                return res.status === 'ok'? this._replace(path) : this._replace(path, 'error');
            });
    }

    mv(from, to){
        const url = '/api/files/mv?from='+prepare(from)+"&to="+prepare(to);

        ui_before_request(from, to)
            .then(() => this._ls_from_cache(Path.dirname(from)+"/"))
            .then(() => http_get(url)
                  .then((res) => {
                      if(res.status === 'ok'){
                          ui_when_success(from, to)
                              .then(() => this._ls_from_cache(Path.dirname(from)+"/"));
                      }else{
                          ui_when_fail(from, to)
                              .then(() => this._ls_from_cache(Path.dirname(from)+"/"));
                      }
                      return Promise.resolve(res);
                  }));

        function ui_before_request(from, to){
            return update_from()
                .then((file) => {
                    if(Path.dirname(from) !== Path.dirname(to)){
                        return update_to(file);
                    }
                    return Promise.resolve();
                });

            function update_from(){
                return cache.get(cache.FILE_PATH, Path.dirname(from)+"/", false)
                    .then((res_from) => {
                        let _file = {name: Path.basename(from), type: /\/$/.test(from) ? 'directory' : 'file'};
                        res_from.results = res_from.results.map((file) => {
                            if(file.name === Path.basename(from)){
                                file.name = Path.basename(to);
                                file.icon = 'loading';
                                _file = file;
                            }
                            return file;
                        });
                        return cache.put(cache.FILE_PATH, Path.dirname(from)+"/", res_from)
                            .then(() => Promise.resolve(_file));
                    });
            }
            function update_to(file){
                return cache.get(cache.FILE_PATH, Path.dirname(to)+"/", false).then((res_to) => {
                    if(!res_to || !res_to.results) return Promise.resolve();
                    res_to.results.push(file);
                    return cache.put(cache.FILE_PATH, Path.dirname(to)+"/", res_to);
                });
            }
        }
        function ui_when_fail(from, to){
            return update_from()
                .then((file) => {
                    if(Path.dirname(from) !== Path.dirname(to)){
                        return update_to();
                    }
                    return Promise.resolve();
                });

            function update_from(){
                return cache.get(cache.FILE_PATH, Path.dirname(from)+"/", false)
                    .then((res_from) => {
                        if(!res_from || !res_from.results) return Promise.reject();
                        res_from.results = res_from.results.map((file) => {
                            if(file.name === Path.basename(from)){
                                file.icon = 'error';
                            }
                            return file;
                        });
                        return cache.put(cache.FILE_PATH, Path.dirname(from)+"/", res_from)
                            .then(() => Promise.resolve());
                    });
            }

            function update_to(){
                return cache.get(cache.FILE_PATH, Path.dirname(to)+"/", false)
                    .then((res_to) => {
                        if(!res_to || !res_to.results) return Promise.resolve();
                        res_to.results = res_to.results.filter((file) => {
                            if(file.name === Path.basename(to)){
                                return false;
                            }
                            return true;
                       });
                        return cache.put(cache.FILE_PATH, Path.dirname(from)+"/", res_to);
                    });
            }
        }
        function ui_when_success(from, to){
            if(Path.dirname(from) === Path.dirname(to)){
                this._replace(Path.dirname(from)+"/"+Path.basename(to), null);
                return Promise.resolve();
            }else{
                return update_from()
                    .then(update_to)
                    .then(update_related);
            }

            function update_from(){
                return cache.get(cache.FILE_PATH, Path.dirname(from)+"/", false).then((res_from) => {
                    if(!res_from || !res_from.results) return Promise.resolve();
                    res_from.results = res_from.results.filter((file) => {
                        if(file.name === Path.basename(to)){
                            return false;
                        }
                        return true;
                    });
                    return cache.put(cache.FILE_PATH, Path.dirname(from)+"/", res_from);
                });
            }
            function update_to(){
                return cache.get(cache.FILE_PATH, Path.dirname(to)+"/", false).then((res_to) => {
                    const target_already_exist = res_to && res_to.results ? true : false;
                    if(target_already_exist){
                        res_to.results = res_to.results.map((file) => {
                            if(file.name === Path.basename(to)){
                                delete file.icon;
                            }
                            return file;
                        });
                        return cache.put(cache.FILE_PATH, Path.dirname(to)+"/", res_to);
                    }else{
                        const data = {results: [{
                            name: Path.basename(to),
                            type: /\/$/.test(to) ? 'directory' : 'file',
                            time: (new Date()).getTime()
                        }]};
                        return cache.put(cache.FILE_PATH, Path.dirname(to)+"/", data);
                    }
                });
            }
            function update_related(){
                // manage nested directories when we try to rename a directory
                if(/\/$/.test(from) === true){
                    return cache.update_path((data) => {
                        if(data.path !== Path.dirname(to) + "/" && data.path !== Path.dirname(from) + "/" && data.path.indexOf(Path.dirname(from) + "/") === 0){
                            const old_path = data.path;
                            data.path = data.path.replace(Path.dirname(from) + "/", Path.dirname(to) + "/");
                            return cache.remove(cache.FILE_PATH, old_path)
                                .then(() => cache.put(cache.FILE_PATH, data.path, data));
                        }
                        return Promise.resolve();
                    });
                }
            }
        }
    }

    _replace(path, icon){
        return cache.get(cache.FILE_PATH, Path.dirname(path) + "/", false)
            .then((res) => {
                if(!res) return Promise.resolve();
                let files = res.results.map((file) => {
                    if(file.name === Path.basename(path)){
                        if(!icon) delete file.icon;
                        if(icon) file.icon = icon;
                    }
                    return file;
                });
                res.results = files;
                return cache.put(cache.FILE_PATH, Path.dirname(path) + "/", res)
                    .then((res) => {
                        this._ls_from_cache(Path.dirname(path)+"/");
                        return Promise.resolve(res);
                    });
            });
    }

    _add(path, icon){
        return cache.get(cache.FILE_PATH, Path.dirname(path) + "/", false)
            .then((res) => {
                if(!res) return Promise.resolve();
                let file = {
                    name: Path.basename(path),
                    type: /\/$/.test(path) ? 'directory' : 'file',
                };
                if(icon) file.icon = icon;
                res.results.push(file);
                return cache.put(cache.FILE_PATH, Path.dirname(path) + "/", res)
                    .then((res) => {
                        this._ls_from_cache(Path.dirname(path)+"/");
                        return Promise.resolve(res);
                    });
            });
    }
    _remove(path){
        return cache.get(cache.FILE_PATH, Path.dirname(path) + "/", false)
            .then((res) => {
                if(!res) return Promise.resolve();
                let files = res.results.filter((file) => {
                    return file.name === Path.basename(path) ? false : true;
                });
                res.results = files;
                return cache.put(cache.FILE_PATH, Path.dirname(path) + "/", res)
                    .then((res) => {
                        this._ls_from_cache(Path.dirname(path)+"/");
                        return Promise.resolve(res);
                    });
            });
    }
}


export const Files = new FileSystem();
window.Files = Files;
