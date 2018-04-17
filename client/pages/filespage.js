import React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend-filedrop';
import Path from 'path';

import './filespage.scss';
import { Files } from '../model/';
import { NgIf, Loader, Uploader, EventReceiver } from '../components/';
import { notify, debounce, goToFiles, goToViewer, event, screenHeight } from '../helpers/';
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
            error: false,
            height: null
        };

        this.resetHeight = debounce(this.resetHeight.bind(this), 100);
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
        this.resetHeight();
        window.addEventListener("resize", this.resetHeight);
    }

    componentWillUnmount() {
        this.props.unsubscribe('file.upload');
        this.props.unsubscribe('file.create');
        this.props.unsubscribe('file.rename');
        this.props.unsubscribe('file.delete');
        this.props.unsubscribe('file.refresh');
        window.removeEventListener("resize", this.resetHeight);
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
        this.setState({error: false});
    }

    onRefresh(path = this.state.path){
        this.resetHeight();
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
            notify.send(error, 'error');
            this.setState({error: error});
        });
        this.observers.push(observer);
        this.setState({error: false});
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
                    notify.send('A file named "'+Path.basename(path)+'" was created', 'success')
                    return Promise.resolve();
                })
                .catch((err) => {
                    notify.send(err, 'error')
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
        console.log(e);
        const MAX_POOL_SIZE = 2;
        let files = [];
        extract_upload_directory_the_way_that_works_but_non_official(e.dataTransfer.items || [], files)
            .then(() => {
                if(files.length === 0){
                    return extract_upload_crappy_hack_but_official_way(e.dataTransfer);
                }
                return Promise.resolve(files)
            })
            .then(() => {
                const processes = files.map((file) => {
                    file.path = Path.join(path, file.path);
                    if(file.type === 'file'){
                        return this.onCreate.bind(this, file.path, 'file', file.file);
                    }else{
                        return this.onCreate.bind(this, file.path, 'directory');
                    }
                });
                function runner(id){
                    if(processes.length === 0) return Promise.resolve();
                    return processes.shift()(id)
                        .then(() => runner(id));
                }

                Promise.all(Array.apply(null, Array(MAX_POOL_SIZE)).map((process,index) => {
                    return runner();
                })).then(() => {
                    console.log("DONE: "+processes.length);
                }).catch((err) => {
                    console.log("ERROR"+processes.length, err);
                });
            });

        function extract_upload_directory_the_way_that_works_but_non_official(items, _files){
            const traverseDirectory = (item, _files) => {
                let file = {
                    path: item.fullPath,
                };
                if(item.isFile){
                    return new Promise((done, err) => {
                        file.type = "file";
                        item.file((_file, _err) => {
                            if(!_err){
                                file.file = _file;
                                _files.push(file);
                            }
                            done();
                        });
                    });
                }else if(item.isDirectory){
                    file.type = "directory";
                    file.path += "/";
                    _files.push(file);

                    return new Promise((done, err) => {
                        item.createReader().readEntries(function(entries){
                            Promise.all(entries.map((entry) => {
                                return traverseDirectory(entry, _files)
                            })).then(() => done());
                        });
                    });
                }else{
                    return Promise.resolve();
                }
            }
            return Promise.all(
                Array.prototype.slice.call(items)
                    .map((item) => {
                        if(typeof item.webkitGetAsEntry === 'function'){
                            return traverseDirectory(item.webkitGetAsEntry(), _files);
                        }
                    })
                    .filter((e) => e)
            );
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
                            let reader = new FileReader();
                            reader.onload = function() {
                                done('file');
                            };
                            reader.onerror = function() {
                                done('directory');
                            }
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
                        files.push(file);
                        return Promise.resolve();
                    }
                })
            );
        }
    }

    resetHeight(){
        this.setState({
            height: screenHeight()
        });
    }


    render() {
        return (
            <div className="component_page_filespage">
              <BreadCrumb className="breadcrumb" path={this.state.path} />
              <div style={{height: this.state.height+'px'}} className="scroll-y">
                <NgIf className="container" cond={this.state.loading === false}>
                  <NgIf cond={this.state.path === '/'}>
                    <FrequentlyAccess files={this.state.frequents}/>
                  </NgIf>
                  <FileSystem path={this.state.path} files={this.state.files} />
                  <Uploader path={this.state.path} />
                </NgIf>
                <NgIf cond={this.state.loading}>
                  <Loader/>
                </NgIf>
              </div>
            </div>
        );
    }
}
