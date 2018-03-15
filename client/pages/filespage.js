import React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { default as TouchBackend } from 'react-dnd-touch-backend';
import Path from 'path';

import './filespage.scss';
import { Files } from '../model/';
import { NgIf, Loader, Error, Uploader, EventReceiver } from '../components/';
import { debounce, goToFiles, goToViewer, event } from '../helpers/';
import { BreadCrumb, FileSystem } from './filespage/';

@EventReceiver
@DragDropContext(('ontouchstart' in window)? HTML5Backend : HTML5Backend)
export class FilesPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            path: props.match.url.replace('/files', '') || '/',
            files: [],
            loading: false,
            error: false,
            height: null
        };
        this.resetHeight = debounce(this.resetHeight.bind(this), 100);
        this.goToFiles = goToFiles.bind(null, this.props.history);
        this.goToViewer = goToViewer.bind(null, this.props.history);
        this.observers = {ls: null};
    }

    componentDidMount(){
        this.onPathUpdate(this.state.path, 'directory');

        // subscriptions
        this.props.subscribe('file.select', this.onPathUpdate.bind(this));
        this.props.subscribe('file.upload', this.onUpload.bind(this));
        this.props.subscribe('file.create', this.onCreate.bind(this));
        this.props.subscribe('file.rename', this.onRename.bind(this));
        this.props.subscribe('file.delete', this.onDelete.bind(this));
        this.props.subscribe('file.refresh', this.onRefresh.bind(this));

        this.resetHeight();
        this.hideError();
        window.addEventListener("resize", this.resetHeight);
    }

    componentWillUnmount() {
        this.props.unsubscribe('file.select');
        this.props.unsubscribe('file.upload');
        this.props.unsubscribe('file.create');
        this.props.unsubscribe('file.rename');
        this.props.unsubscribe('file.delete');
        this.props.unsubscribe('file.refresh');
        window.removeEventListener("resize", this.resetHeight);
        if(this.observers.ls) this.observers.ls.unsubscribe();
    }

    hideError(){
        this.setState({error: false});
    }

    onRefresh(path = this.state.path){
        if(this.observers.ls) this.observers.ls.unsubscribe();
        this.observers.ls = Files.ls(path).subscribe((files) => {
            this.setState({files: files, loading: false})
        }, (error) => {
            console.log("ERROR", error);
            this.setState({error: error});
        });
        this.setState({error: false});
    }

    onPathUpdate(path, type = 'directory'){
        window.timestamp = new Date();
        if(type === 'file'){
            this.props.history.push('/view'+path);
        }else{
            this.setState({path: path, loading: true});
            this.onRefresh(path)
            if(path !== this.state.path){
                this.props.history.push('/files'+path);
            }
        }
    }

    onCreate(path, type, file){
        if(type === 'file'){
            return Files.touch(path, file);
        }else if(type === 'directory'){
            return Files.mkdir(path);
        }else{
            return Promise.reject({message: 'internal error: can\'t create a '+type.toString(), code: 'UNKNOWN_TYPE'});
        }
    }
    onRename(from, to, type){
        return Files.mv(from, to, type);
    }
    onDelete(file, type){
        return Files.rm(file, type);
    }

    onUpload(path, files){
        const createFilesInUI = (_files) => {
            const newfiles = _files.map((file) => {
                return {
                    time: new Date().getTime(),
                    name: file.name,
                    type: 'file',
                    size: file.size,
                    icon: 'loading',
                    virtual: true
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
            height: document.body.clientHeight - document.querySelector('.breadcrumb').offsetHeight
        });
    }


    render() {
        return (
            <div className="component_page_filespage">
              <BreadCrumb className="breadcrumb" path={this.state.path} />
              <div style={{height: this.state.height+'px'}} className="scroll-y">
                <NgIf className="container" cond={!this.state.loading}>
                  <FileSystem path={this.state.path} files={this.state.files} />
                  <Uploader path={this.state.path} />
                </NgIf>
                <NgIf cond={this.state.loading}>
                  <NgIf cond={this.state.error === false}>
                    <Loader/>
                  </NgIf>
                  <NgIf className="error" cond={this.state.error !== false} onClick={this.componentDidMount.bind(this)}>
                    <Error err={this.state.error}/>
                  </NgIf>
                </NgIf>
              </div>
            </div>
        );
    }
}
