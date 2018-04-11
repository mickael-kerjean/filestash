import React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { default as TouchBackend } from 'react-dnd-touch-backend';
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
                .then(() => notify.send('A file named "'+Path.basename(path)+'" was created', 'success'))
                .catch((err) => notify.send(err, 'error'));
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

    onUpload(path, files){
        const createFilesInUI = (_files) => {
            const newfiles = _files.map((file) => {
                return {
                    time: new Date().getTime(),
                    name: file.name,
                    type: 'file',
                    size: file.size,
                    icon: 'loading'
                };
            });
            const files = JSON.parse(JSON.stringify(this.state.files));
            this.setState({files: [].concat(newfiles, files)});
            return Promise.resolve(_files);
        };

        const processFile = (file) => {
            return this.onCreate(Path.join(path, file.name), 'file', file);
        };

        const updateUI = (filename) => {
            const files = JSON.parse(JSON.stringify(this.state.files))
                  .map((file) => {
                      // persist file in UI
                      if(file.name === filename){
                          file.virtual = false;
                          delete file.icon;
                      }
                      // remove from ui if we upload the file in a different directory
                      return path === this.state.path ? file : null;
                  })
                  .filter((file) => {
                      return file === null? false : true;
                  });
            this.setState({files: files});
            return Promise.resolve('ok');
        };

        const showError = (filename, err) => {
            if(err && err.code === 'CANCELLED'){ return }
            const files = JSON.parse(JSON.stringify(this.state.files))
                  .map((file) => {
                      if(file.name === filename){
                          file.icon = 'error';
                          file.message = err && err.message || 'oups something went wrong';
                          file.virtual = true;
                      }
                      return file;
                  });
            this.setState({files: files});
            return Promise.resolve('ok');
        };

        function generator(arr){
            let store = arr;
            return {
                next: function(){
                    return store.pop();
                }
            };
        }

        function job(it){
            let file = it.next();
            if(file){
                return processFile(file)
                    .then((ok) => updateUI(file.name))
                    .then(() => job(it))
                    .catch((err) => showError(file.name, err));
            }else{
                return Promise.resolve('ok');
            }
        }

        function process(it, pool){
            return Promise.all(Array.apply(null, Array(pool)).map(() => {
                return job(it);
            }));
        }

        const poolSize = 10;
        return createFilesInUI(files)
            .then((files) => Promise.resolve(generator(files)))
            .then((it) => process(it, poolSize))
            .then((res) => Promise.resolve('ok'));
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
