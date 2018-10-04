"use strict";

import { http_get, http_post, prepare, basename, dirname, pathBuilder } from '../helpers/';
import { filetype, currentShare, appendShareToUrl } from '../helpers/';

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
                .then((cache) => {
                    const fetch_from_http = (_path) => {
                        return this._ls_from_http(_path)
                            .then(() => new Promise((done, err) => {
                                window.setTimeout(() => done(), 2000);
                            }))
                            .then(() => {
                                if(keep_pulling_from_http === false) return Promise.resolve();
                                return fetch_from_http(_path);
                            })
                            .catch((e) => {
                                if(cache === null){
                                    this.obs && this.obs.error({message: "Unknown Path"});
                                }
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
        let url = appendShareToUrl('/api/files/ls?path='+prepare(path));

        return http_get(url).then((response) => {
            return cache.upsert(cache.FILE_PATH, [currentShare(), path], (_files) => {
                let store = Object.assign({
                    share: currentShare(),
                    path: path,
                    results: null,
                    access_count: 0,
                    metadata: null
                }, _files);
                store.results = response.results || [];
                store.results = store.results.map((f) => {
                    f.path = pathBuilder(path, f.name, f.type);
                    return f;
                });
                store.metadata = response.metadata;

                if(_files && _files.results){
                    store.access_count = _files.access_count;

                    // find out which entry we want to keep from the cache
                    let _files_virtual_to_keep = _files.results.filter((file) => {
                        return file.icon === 'loading';
                    });
                    // update file results when something is going on
                    for(let i=0; i<_files_virtual_to_keep.length; i++){
                        for(let j=0; j<store.results.length; j++){
                            if(store.results[j].name === _files_virtual_to_keep[i].name){
                                store.results[j] = Object.assign({}, _files_virtual_to_keep[i]);
                                _files_virtual_to_keep[i] = null;
                                break;
                            }
                        }
                    }
                    // add stuff that didn't exist in our response
                    _files_virtual_to_keep = _files_virtual_to_keep.filter((e) => e);
                    store.results = store.results.concat(_files_virtual_to_keep);
                }

                if(this.current_path === path){
                    this.obs && this.obs.next({
                        status: 'ok',
                        results: store.results,
                        metadata: store.metadata
                    });
                }
                store.last_update = new Date();
                store.last_access = new Date();
                return store;
            });
        }).catch((_err) => {
            this.obs.next(_err);
            return Promise.reject(null);
        });
    }

    _ls_from_cache(path, _record_access = false){
        return cache.get(cache.FILE_PATH, [currentShare(), path]).then((response) => {
            if(!response || !response.results) return null;
            if(this.current_path === path){
                this.obs && this.obs.next({
                    status: 'ok',
                    results: response.results,
                    metadata: response.metadata
                });
            }
            return response;
        }).then((e) => {
            requestAnimationFrame(() => {
                if(_record_access === true){
                    cache.upsert(cache.FILE_PATH, [currentShare(), path], (response) => {
                        if(!response || !response.results) return null;
                        if(this.current_path === path){
                            this.obs && this.obs.next({
                                status: 'ok',
                                results: response.results,
                                metadata: response.metadata
                            });
                        }
                        response.last_access = new Date();
                        response.access_count += 1;
                        return response;
                    });
                }
            });
            return Promise.resolve(e);
        });
    }

    rm(path){
        const url = appendShareToUrl('/api/files/rm?path='+prepare(path));
        return this._replace(path, 'loading')
            .then((res) => this.current_path === dirname(path) ? this._ls_from_cache(dirname(path)) : Promise.resolve(res))
            .then(() => http_get(url))
            .then((res) => {
                return cache.remove(cache.FILE_CONTENT, [currentShare(), path])
                    .then(cache.remove(cache.FILE_CONTENT, [currentShare(), path], false))
                    .then(cache.remove(cache.FILE_PATH, [currentShare(), dirname(path)], false))
                    .then(this._remove(path, 'loading'))
                    .then((res) => this.current_path === dirname(path) ? this._ls_from_cache(dirname(path)) : Promise.resolve(res))
            })
            .catch((err) => {
                return this._replace(path, 'error', 'loading')
                    .then((res) => this.current_path === dirname(path) ? this._ls_from_cache(dirname(path)) : Promise.resolve(res))
                    .then(() => Promise.reject(err));
            });
    }

    cat(path){
        const url = appendShareToUrl('/api/files/cat?path='+prepare(path));
        return http_get(url, 'raw')
            .then((res) => {
                if(this.is_binary(res) === true){
                    return Promise.reject({code: 'BINARY_FILE'});
                }
                return cache.upsert(cache.FILE_CONTENT, [currentShare(), path], (response) => {
                    let file = response? response : {
                        share: currentShare(),
                        path: path,
                        last_update: null,
                        last_access: null,
                        access_count: -1,
                        result: null
                    };
                    file.result = res;
                    file.access_count += 1;
                    file.last_access = new Date();
                    return file;
                }).then((response) => Promise.resolve(response.result));
            })
            .catch((err) => {
                if(err.code === 'BINARY_FILE') return Promise.reject(err);

                return cache.update(cache.FILE_CONTENT, [currentShare(), path], (response) => {
                    response.last_access = new Date();
                    response.access_count += 1;
                    return response;
                }).then((response) => {
                    if(!response || !response.result) return Promise.reject(err);
                    return Promise.resolve(response.result);
                });
            });
    }
    url(path){
        const url = appendShareToUrl('/api/files/cat?path='+prepare(path));
        return Promise.resolve(url);
    }

    save(path, file){
        const url = appendShareToUrl('/api/files/cat?path='+prepare(path));
        let formData = new window.FormData();
        formData.append('file', file, "test");
        return this._replace(path, 'loading')
            .then(() => http_post(url, formData, 'multipart'))
            .then(() => {
                return this._saveFileToCache(path, file)
                    .then(() => this._replace(path, null, 'loading'))
                    .then(() => this._refresh(path));
            })
            .catch((err) => {
                return this._replace(path, 'error', 'loading')
                    .then(() => this._refresh(path))
                    .then(() => Promise.reject(err));
            });
    }

    mkdir(path, step){
        const url = appendShareToUrl('/api/files/mkdir?path='+prepare(path)),
              origin_path = pathBuilder(this.current_path, basename(path), 'directoy'),
              destination_path = path;

        const action_prepare = (part_of_a_batch_operation = false) => {
            if(part_of_a_batch_operation === true){
                return this._add(destination_path, 'loading')
                    .then(() => this._refresh(destination_path));
            }

            return this._add(destination_path, 'loading')
                .then(() => origin_path !== destination_path ? this._add(origin_path, 'loading') : Promise.resolve())
                .then(() => this._refresh(origin_path, destination_path));
        };

        const action_execute = (part_of_a_batch_operation = false) => {
            if(part_of_a_batch_operation === true){
                return http_get(url)
                    .then(() => {
                        return this._replace(destination_path, null, 'loading')
                            .then(() => this._refresh(destination_path));
                    })
                    .catch((err) => {
                        this._replace(destination_path, 'error', 'loading')
                            .then(() => this._refresh(origin_path, destination_path));
                        return Promise.reject(err);
                    });
            }

            return http_get(url)
                .then(() => {
                    return this._replace(destination_path, null, 'loading')
                        .then(() => origin_path !== destination_path ? this._remove(origin_path, 'loading') : Promise.resolve())
                        .then(() => cache.add(cache.FILE_PATH, [currentShare(), destination_path], {
                            path: destination_path,
                            share: currentShare(),
                            results: [],
                            access_count: 0,
                            last_access: null,
                            last_update: new Date()
                        }))
                        .then(() => this._refresh(origin_path, destination_path));
                })
                .catch((err) => {
                    this._replace(origin_path, 'error', 'loading')
                        .then(() => origin_path !== destination_path ? this._remove(destination_path, 'loading') : Promise.resolve())
                        .then(() => this._refresh(origin_path, destination_path));
                    return Promise.reject(err);
                });
        };


        if(step === 'prepare_only'){
            return action_prepare(true);
        }else if(step === 'execute_only'){
            return action_execute(true);
        }else{
            return action_prepare().then(action_execute);
        }
    }

    touch(path, file, step){
        const origin_path = pathBuilder(this.current_path, basename(path), 'file'),
              destination_path = path;

        const action_prepare = (part_of_a_batch_operation = false) => {
            if(part_of_a_batch_operation === true){
                return this._add(destination_path, 'loading')
                    .then(() => this._refresh(destination_path));
            }else{
                return this._add(destination_path, 'loading')
                    .then(() => origin_path !== destination_path ? this._add(origin_path, 'loading') : Promise.resolve())
                    .then(() => this._refresh(origin_path, destination_path));
            }
        };
        const action_execute = (part_of_a_batch_operation = false) => {
            if(part_of_a_batch_operation === true){
                return query()
                    .then(() => {
                        return this._replace(destination_path, null, 'loading')
                            .then(() => this._refresh(destination_path));
                    })
                    .catch((err) => {
                        this._replace(destination_path, null, 'error')
                            .then(() => this._refresh(destination_path));
                        return Promise.reject(err);
                    });
            }
            return query()
                .then(() => {
                    return this._saveFileToCache(path, file)
                        .then(() => this._replace(destination_path, null, 'loading'))
                        .then(() => origin_path !== destination_path ? this._remove(origin_path, 'loading') : Promise.resolve())
                        .then(() => this._refresh(origin_path, destination_path));
                })
                .catch((err) => {
                    this._replace(origin_path, 'error', 'loading')
                        .then(() => origin_path !== destination_path ? this._remove(destination_path, 'loading') : Promise.resolve())
                        .then(() => this._refresh(origin_path, destination_path));
                    return Promise.reject(err);
                });

            function query(){
                if(file){
                    const url = appendShareToUrl('/api/files/cat?path='+prepare(path));
                    let formData = new window.FormData();
                    formData.append('file', file);
                    return http_post(url, formData, 'multipart');
                }else{
                    const url = appendShareToUrl('/api/files/touch?path='+prepare(path));
                    return http_get(url);
                }
            }
        };

        if(step === 'prepare_only'){
            return action_prepare(true);
        }else if(step === 'execute_only'){
            return action_execute(true);
        }else{
            return action_prepare().then(action_execute);
        }
    }

    mv(from, to){
        const url = appendShareToUrl('/api/files/mv?from='+prepare(from)+"&to="+prepare(to)),
              origin_path = from,
              destination_path = to;

        return this._replace(origin_path, 'loading')
            .then(this._add(destination_path, 'loading'))
            .then(() => this._refresh(origin_path, destination_path))
            .then(() => http_get(url))
            .then((res) => {
                return this._remove(origin_path, 'loading')
                    .then(() => this._replace(destination_path, null, 'loading'))
                    .then(() => this._refresh(origin_path, destination_path))
                    .then(() => {
                        cache.update(cache.FILE_PATH, [currentShare(), origin_path], (data) => {
                            data.path = data.path.replace(origin_path, destination_path);
                            return data;
                        }, false);
                        cache.update(cache.FILE_CONTENT, [currentShare(), origin_path], (data) => {
                            data.path = data.path.replace(origin_path, destination_path);
                            return data;
                        }, false);
                        return Promise.resolve();
                    });
            })
            .catch((err) => {
                this._replace(origin_path, 'error', 'loading')
                    .then(() => this._remove(destination_path, 'loading'))
                    .then(() => this._refresh(origin_path, destination_path))
                return Promise.reject(err);
            });
    }

    frequents(){
        let data = [];
        return cache.fetchAll((value) => {
            if(value.access_count >= 1 && value.path !== "/"){
                data.push(value);
            }
        }, cache.FILE_PATH, [currentShare(), "/"]).then(() => {
            return Promise.resolve(
                data
                    .sort((a,b) => a.access_count > b.access_count? -1 : 1)
                    .map((a) => a.path)
                    .slice(0,6)
            );
        });
    }

    _saveFileToCache(path, file){
        if(!file) return update_cache("");
        return new Promise((done, err) => {
            const reader = new FileReader();
            reader.readAsText(file);
            reader.onload = () => this.is_binary(reader.result) === false? update_cache(reader.result).then(done) : done();
            reader.onerror = (err) => err(err);
        });

        function update_cache(result){
            return cache.upsert(cache.FILE_CONTENT, [currentShare(), path], (response) => {
                if(!response) response = {
                    share: currentShare(),
                    path: path,
                    last_access: null,
                    last_update: null,
                    result: null,
                    access_count: 0
                };
                response.last_update = new Date();
                response.result = result;
                return response;
            });
        }
    }

    _refresh(origin_path, destination_path){
        if(this.current_path === dirname(origin_path) ||
           this.current_path === dirname(destination_path)){
            return this._ls_from_cache(this.current_path);
        }
        return Promise.resolve();
    }

    _replace(path, icon, icon_previous){
        return cache.update(cache.FILE_PATH, [currentShare(), dirname(path)], function(res){
            res.results = res.results.map((file) => {
                if(file.name === basename(path) && file.icon == icon_previous){
                    if(!icon){ delete file.icon; }
                    if(icon){ file.icon = icon; }
                }
                return file;
            });
            return res;
        });
    }
    _add(path, icon){
        return cache.upsert(cache.FILE_PATH, [currentShare(), dirname(path)], function(res){
            if(!res || !res.results){
                res = {
                    path: dirname(path),
                    results: [],
                    access_count: 0,
                    last_access: null,
                    last_update: new Date()
                };
            }
            let file = {
                name: basename(path),
                type: /\/$/.test(path) ? 'directory' : 'file'
            };
            if(icon) file.icon = icon;
            res.results.push(file);
            return res;
        });
    }
    _remove(path, previous_icon){
        return cache.update(cache.FILE_PATH, [currentShare(), dirname(path)], function(res){
            if(!res) return null;
            res.results = res.results.filter((file) => {
                return file.name === basename(path) && file.icon == previous_icon ? false : true;
            });
            return res;
        });
    }


    is_binary(str){
        // Reference: https://en.wikipedia.org/wiki/Specials_(Unicode_block)#Replacement_character
        return /\ufffd/.test(str);
    }
}

export const Files = new FileSystem();
