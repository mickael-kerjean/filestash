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

    onCreate(path, type, file, id){
        console.log("> creating ("+id+")\t:"+Path.basename(path));
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

    onUpload(path, files){
        const MAX_POOL_SIZE = 2;
        const processes = files.map((file) => {
            return this.onCreate.bind(this, Path.join(path, file.name), 'file', file);
        });

        console.log("- starting: "+processes.length);
        Promise.all(Array.apply(null, Array(MAX_POOL_SIZE)).map((e,index) => {
            return runner(index);
        })).then(() => {
            console.log("DONE: "+processes.length);
        }).catch((err) => {
            console.log("ERROR"+processes.length, err);
        });

        function runner(id){
            if(processes.length === 0) return Promise.resolve();
            return processes.shift()(id)
                .then(() => runner(id));
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
