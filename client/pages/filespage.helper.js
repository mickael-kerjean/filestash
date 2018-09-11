import { Files } from '../model/';
import { notify } from '../helpers/';
import Path from 'path';
import Worker from "../worker/search.worker.js";
import { Observable } from "rxjs/Observable";

export const sort = function(files, type){
    if(type === 'name'){
        return sortByName(files);
    }else if(type === 'date'){
        return sortByDate(files);
    }else{
        return sortByType(files);
    }
    function sortByType(files){
        return files.sort((fileA, fileB) => {
            if(fileA.icon === 'loading' && fileB.icon !== 'loading'){return +1;}
            else if(fileA.icon !== 'loading' && fileB.icon === 'loading'){return -1;}
            else{
                if(['directory', 'link'].indexOf(fileA.type) === -1 && ['directory', 'link'].indexOf(fileB.type) !== -1){
                    return +1;
                }else if(['directory', 'link'].indexOf(fileA.type) !== -1 && ['directory', 'link'].indexOf(fileB.type) === -1){
                    return -1;
                }else{
                    if(fileA.name[0] === "." && fileB.name[0] !== ".") return +1;
                    else if(fileA.name[0] !== "." && fileB.name[0] === ".") return -1;
                    else{
                        const aExt = Path.extname(fileA.name.toLowerCase()),
                              bExt = Path.extname(fileB.name.toLowerCase());
                        if(fileA.name.toLowerCase() === fileB.name.toLowerCase()){
                            return fileA.name > fileB.name ? +1 : -1;
                        }else{
                            if(aExt !== bExt) return aExt > bExt ? +1 : -1
                            else return fileA.name.toLowerCase() > fileB.name.toLowerCase() ? +1 : -1;
                        }
                    }
                }
            }
        });
    }
    function sortByName(files){
        return files.sort((fileA, fileB) => {
            if(fileA.icon === 'loading' && fileB.icon !== 'loading'){return +1;}
            else if(fileA.icon !== 'loading' && fileB.icon === 'loading'){return -1;}
            else{
                if(fileA.name[0] === "." && fileB.name[0] !== ".") return +1;
                else if(fileA.name[0] !== "." && fileB.name[0] === ".") return -1;
                else{
                    if(fileA.name.toLowerCase() === fileB.name.toLowerCase()){
                        return fileA.name > fileB.name ? +1 : -1;
                    }
                    return fileA.name.toLowerCase() > fileB.name.toLowerCase() ? +1 : -1;
                }
            }
        });
    }
    function sortByDate(files){
        return files.sort((fileA, fileB) => {
            if(fileA.icon === 'loading' && fileB.icon !== 'loading'){return +1;}
            else if(fileA.icon !== 'loading' && fileB.icon === 'loading'){return -1;}
            else{
                if(fileB.time === fileA.time){
                    return fileA.name > fileB.name ? +1 : -1;
                }
                return fileB.time - fileA.time;
            }
        });
    }
};

export const onCreate = function(path, type, file){
    if(type === 'file'){
        return Files.touch(path, file)
            .then(() => {
                notify.send('A file named "'+Path.basename(path)+'" was created', 'success');
                return Promise.resolve();
            })
            .catch((err) => {
                notify.send(err, 'error');
                return Promise.reject(err);
            });
    }else if(type === 'directory'){
        return Files.mkdir(path)
            .then(() => notify.send('A folder named "'+Path.basename(path)+'" was created', 'success'))
            .catch((err) => notify.send(err, 'error'));
    }else{
        return Promise.reject({message: 'internal error: can\'t create a '+type.toString(), code: 'UNKNOWN_TYPE'});
    }
};

export const onRename = function(from, to, type){
    return Files.mv(from, to, type)
        .then(() => notify.send('The file "'+Path.basename(from)+'" was renamed', 'success'))
        .catch((err) => notify.send(err, 'error'));
};

export const onDelete = function(path, type){
    return Files.rm(path, type)
        .then(() => notify.send('The file "'+Path.basename(path)+'" was deleted', 'success'))
        .catch((err) => notify.send(err, 'error'));
};

export const onUpload = function(path, e){
    const MAX_POOL_SIZE = 10;
    let PRIOR_STATUS = {};
    extract_upload_directory_the_way_that_works_but_non_official(e.dataTransfer.items || [], [])
        .then((files) => {
            if(files.length === 0){
                return extract_upload_crappy_hack_but_official_way(e.dataTransfer);
            }
            return Promise.resolve(files);
        })
        .then((files) => {
            console.log("== FILES: " + files.length)
            const processes = files.map((file) => {
                file.path = Path.join(path, file.path);
                if(file.type === 'file'){
                    Files.touch(file.path, file.file, 'prepare_only');
                    return {
                        parent: file._prior || null,
                        fn: Files.touch.bind(Files, file.path, file.file, 'execute_only')
                    };
                }else{
                    Files.mkdir(file.path, 'prepare_only');
                    return {
                        id: file._id || null,
                        parent: file._prior || null,
                        fn: Files.mkdir.bind(Files, file.path, 'execute_only')
                    };
                }
            });
            function runner(id){
                let current_process = null;
                if(processes.length === 0) return Promise.resolve();

                var i;
                for(i=0; i<processes.length; i++){
                    if(processes[i].parent === null){
                        // init: getting started with creation of files/folders
                        current_process = processes[i];
                        processes.splice(i, 1);
                        break;
                    }else if(PRIOR_STATUS[processes[i].parent] === true){
                        // running: make sure we've created the parent before attempting the entire filesystem
                        current_process = processes[i];
                        processes.splice(i, 1);
                        break;
                    }
                }
                
                console.log(" p:"+processes.length+" ::"+i)
                
                if(current_process){
                    return current_process.fn(id)
                        .then(() => {
                            if(current_process.id) PRIOR_STATUS[current_process.id] = true;
                            return runner(id);
                        })
                        .catch((err) => {
                            notify.send(err, 'error');
                            return runner(id);
                        });
                }else{
                    return waitABit()
                        .then(() => runner(id));
                    function waitABit(){
                        return new Promise((done) => {
                            window.setTimeout(() => {
                                requestAnimationFrame(() => {
                                    done();
                                });
                            }, 1000);
                        });
                    }
                }
            }

            if(files.length > 5){
                notify.send('Uploading '+files.length+' files', 'info');
            }
            Promise.all(Array.apply(null, Array(MAX_POOL_SIZE)).map((process,index) => {
                return runner();
            })).then(() => {
                notify.send('Upload completed', 'success');
            }).catch((err) => {
                notify.send(err, 'error');
            });
        });



    // adapted from: https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
    function _rand_id(){
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + s4() + s4();
    }

    function extract_upload_directory_the_way_that_works_but_non_official(items, files = []){
        const traverseDirectory = (item, _files, parent_id) => {
            let file = {
                path: item.fullPath
            };
            if(item.isFile){
                return new Promise((done, err) => {
                    file.type = "file";
                    item.file((_file, _err) => {
                        if(!_err){
                            file.file = _file;
                            if(parent_id) file._prior = parent_id;
                            _files.push(file);
                        }
                        done(_files);
                    });
                });
            }else if(item.isDirectory){
                file.type = "directory";
                file.path += "/";
                file._id = _rand_id();
                if(parent_id) file._prior = parent_id;
                _files.push(file);

                return new Promise((done, err) => {
                    item.createReader().readEntries(function(entries){
                        Promise.all(entries.map((entry) => {
                            return traverseDirectory(entry, _files, file._id);
                        })).then(() => done(_files));
                    });
                });
            }else{
                return Promise.resolve();
            }
        };
        return Promise.all(
            Array.prototype.slice.call(items).map((item) => {
                if(typeof item.webkitGetAsEntry === 'function'){
                    return traverseDirectory(item.webkitGetAsEntry(), files.slice(0));
                }
            }).filter((e) => e)
        ).then((res) => Promise.resolve([].concat.apply([], res)));
    }

    function extract_upload_crappy_hack_but_official_way(data){
        const _files = data.files;
        return Promise.all(
            Array.prototype.slice.call(_files).map((_file) => {
                return detectType(_file)
                    .then(transform);
                function detectType(_f){
                    // the 4096 is an heuristic I've observed and taken from: https://stackoverflow.com/questions/25016442/how-to-distinguish-if-a-file-or-folder-is-being-dragged-prior-to-it-being-droppe
                    // however the proposed answer is just wrong as it doesn't consider folder with name such as: test.png
                    // and as Stackoverflow favor consanguinity with their point system, I couldn't rectify the proposed answer.
                    // The following code is actually working as expected
                    if(_file.size % 4096 !== 0){
                        return Promise.resolve('file');
                    }
                    return new Promise((done, err) => {
                        let reader = new window.FileReader();
                        reader.onload = function() {
                            done('file');
                        };
                        reader.onerror = function() {
                            done('directory');
                        };
                        reader.readAsText(_f);
                    });
                }

                function transform(_type){
                    let file = {
                        type: _type,
                        path: _file.name
                    };
                    if(file.type === 'file'){
                        file.file = _file;
                    }else{
                        file.path += "/";
                    }
                    return Promise.resolve(file);
                }
            })
        );
    }
};




const worker = new Worker();9
export const onSearch = (keyword, path = "/") => {
    worker.postMessage({
        action: "search::find",
        path: path,
        keyword: keyword
    });
    return new Observable((obs) => {
        worker.onmessage = (m) => {
            obs.next(m.data);
        }
    });
};
