import React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend-filedrop';
import Path from 'path';

import './filespage.scss';
import './error.scss';
import { Files } from '../model/';
import { NgIf, Loader, Uploader, EventReceiver } from '../components/';
import { notify, debounce, goToFiles, goToViewer, event } from '../helpers/';
import { BreadCrumb, FileSystem, FrequentlyAccess } from './filespage/';

@EventReceiver
@DragDropContext(('ontouchstart' in window)? HTML5Backend : HTML5Backend)
export class FilesPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            path: props.match.url.replace('/files', '') || '/',
            files: [],
            frequents: [],
            loading: true,
            error: null,
            height: null
        };

        this.goToFiles = goToFiles.bind(null, this.props.history);
        this.goToViewer = goToViewer.bind(null, this.props.history);
        this.observers = [];
    }

    componentDidMount(){
        this.onRefresh(this.state.path, 'directory');

        // subscriptions
        this.props.subscribe('file.upload', this.onUpload.bind(this));
        this.props.subscribe('file.create', this.onCreate.bind(this));
        this.props.subscribe('file.rename', this.onRename.bind(this));
        this.props.subscribe('file.delete', this.onDelete.bind(this));
        this.props.subscribe('file.refresh', this.onRefresh.bind(this));

        this.hideError();
    }

    componentWillUnmount() {
        this.props.unsubscribe('file.upload');
        this.props.unsubscribe('file.create');
        this.props.unsubscribe('file.rename');
        this.props.unsubscribe('file.delete');
        this.props.unsubscribe('file.refresh');
        this._cleanupListeners();
    }

    componentWillReceiveProps(nextProps){
        let new_path = function(path){
            if(path === undefined){ path = "/"; }
            if(/\/$/.test(path) === false){ path = path + "/"; }
            if(/^\//.test(path) === false){ path = "/"+ path; }
            return path;
        }(nextProps.match.params.path);
        if(new_path !== this.state.path){
            this.setState({path: new_path, loading: true});
            this.onRefresh(new_path);
        }
    }

    hideError(){
        this.setState({error: null});
    }

    onRefresh(path = this.state.path){
        this._cleanupListeners();

        const observer = Files.ls(path).subscribe((res) => {
            if(res.status === 'ok'){
                let files = res.results;
                files = files.map((file) => {
                    let path = this.state.path+file.name;
                    file.link = file.type === "file" ? "/view"+path : "/files"+path+"/";
                    return file;
                });
                this.setState({files: files, loading: false});
            }else{
                notify.send(res, 'error');
            }
        }, (error) => {
            this.setState({error: error});
        });
        this.observers.push(observer);
        this.setState({error: null});
        Files.frequents().then((s) => this.setState({frequents: s}));
    }

    _cleanupListeners(){
        if(this.observers.length > 0) {
            this.observers = this.observers.filter((observer) => {
                observer.unsubscribe();
                return false;
            });
        }
    }

    onCreate(path, type, file){
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
    }
    onRename(from, to, type){
        return Files.mv(from, to, type)
            .then(() => notify.send('The file "'+Path.basename(from)+'" was renamed', 'success'))
            .catch((err) => notify.send(err, 'error'));
    }
    onDelete(path, type){
        return Files.rm(path, type)
            .then(() => notify.send('The file "'+Path.basename(path)+'" was deleted', 'success'))
            .catch((err) => notify.send(err, 'error'));
    }

    onUpload(path, e){
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

                    for(let i=0; i<processes.length; i++){
                        if(processes[i].parent === null || PRIOR_STATUS[processes[i].parent] === true){
                            current_process = processes[i];
                            processes.splice(i, 1);
                            break;
                        }
                    }

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
                                }, 100);
                            });
                        }
                    }
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
    }


    render() {
        return (
            <div className="component_page_filespage">
              <BreadCrumb className="breadcrumb" path={this.state.path} />
              <div className="page_container">
                <div className="scroll-y">
                  <NgIf className="container" cond={this.state.loading === false && this.state.error === null}>
                    <NgIf cond={this.state.path === '/'}>
                      <FrequentlyAccess files={this.state.frequents}/>
                    </NgIf>
                    <FileSystem path={this.state.path} files={this.state.files} />
                    <Uploader path={this.state.path} />
                  </NgIf>
                  <NgIf cond={this.state.loading && this.state.error === null}>
                    <Loader/>
                  </NgIf>
                  <NgIf cond={this.state.error !== null} className="error-page">
                    <h1>Oops!</h1>
                    <h2>It seems this directory doesn't exist</h2>
                    <p>{JSON.stringify(this.state.error)}</p>
                  </NgIf>
                </div>
              </div>
            </div>
        );
    }
}
