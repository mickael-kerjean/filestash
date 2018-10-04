import React from 'react';
import path from 'path';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { DragSource, DropTarget } from 'react-dnd';

import './thing.scss';
import { Card, NgIf, Icon, EventEmitter, Button } from '../../components/';
import { pathBuilder, prompt, alert, leftPad, getMimeType, debounce, memory } from '../../helpers/';
import { Files } from '../../model/';
import { ShareComponent } from './share';
import img_placeholder from '../../assets/img/placeholder.png';

const fileSource = {
    beginDrag(props, monitor, component) {
        return {
            path: props.path,
            name: props.file.name,
            type: props.file.type
        };
    },
    canDrag(props, monitor){
        if (props.metadata.can_move === false){
            return false;
        }
        return props.file.icon === 'loading'? false : true;
    },
    endDrag(props, monitor, component){
        if(monitor.didDrop() && component.state.icon !== 'loading'){
            let result = monitor.getDropResult();
            if(result.action === 'rename'){
                props.emit.apply(component, ['file.rename'].concat(result.args));
            }else{
                throw 'unknown action';
            }
        }
    }
};

const fileTarget = {
    canDrop(props, monitor){
        let file = monitor.getItem();
        if(props.file.type === 'directory' && file.name !== props.file.name && props.file.icon !== 'loading'){
            return true;
        }else{
            return false;
        }
    },
    drop(props, monitor, component){
        let src = monitor.getItem();
        let dest = props.file;

        let from = pathBuilder(props.path, src.name, src.type);
        let to = pathBuilder(props.path, './'+dest.name+'/'+src.name, src.type);
        return {action: 'rename', args: [from, to, src.type], ctx: 'existingfile'};
    }
};

const nativeFileTarget = {
    canDrop: fileTarget.canDrop,
    drop(props, monitor){
        let path = pathBuilder(props.path, props.file.name, 'directory');
        props.emit('file.upload', path, monitor.getItem());
    }
}


@EventEmitter
@DropTarget('__NATIVE_FILE__', nativeFileTarget, (connect, monitor) => ({
    connectDropNativeFile: connect.dropTarget(),
    nativeFileIsOver: monitor.isOver(),
    canDropNativeFile: monitor.canDrop()
}))
@DropTarget('file', fileTarget, (connect, monitor) => ({
    connectDropFile: connect.dropTarget(),
    fileIsOver: monitor.isOver(),
    canDropFile: monitor.canDrop()
}))
@DragSource('file', fileSource, (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
}))
export class ExistingThing extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            hover: null,
            filename: props.file.name,
            is_renaming: false,
            preview: null
        };
    }

    shouldComponentUpdate(nextProps, nextState){
        if(nextState.hover !== this.state.hover ||
           nextState.is_renaming !== this.state.is_renaming ||
           nextProps.view !== this.props.view ||
           this.state.preview !== nextState.preview ||
           this.props.fileIsOver !== nextProps.fileIsOver ||
           this.props.canDropFile !== nextProps.canDropFile ||
           this.props.nativeFileIsOver !== nextProps.nativeFileIsOver ||
           this.props.canDropNativeFile !== nextProps.canDropNativeFile
          ){
            return true;
        }
        return false;
    }

    componentDidMount(){
        this.updateThumbnail(this.props);
    }

    componentWillReceiveProps(props){
        if(props.view !== this.props.view){
            this.updateThumbnail(props);
        }
    }

    updateThumbnail(props){
        if(props.view === "grid" && props.icon !== "loading"){
            const type = getMimeType(props.file.path).split("/")[0];
            if(type === "image"){
                Files.url(props.file.path).then((url) => {
                    this.setState({preview: url+"&thumbnail=true"});
                });
            }
        }
    }

    onRename(newFilename){
        if(typeof newFilename === "string"){
            this.props.emit(
                'file.rename',
                pathBuilder(this.props.path, this.props.file.name, this.props.file.type),
                pathBuilder(this.props.path, newFilename, this.props.file.type),
                this.props.file.type
            );
        }
        this.setState({is_renaming: false});
    }

    onRenameRequest(force){
        let new_state = !this.state.is_renaming;
        if(typeof force === "boolean"){
            new_state = force;
        }
        this.setState({is_renaming: new_state});
    }

    onDeleteRequest(filename){
        prompt.now(
            "Confirm by typing \""+this._confirm_delete_text()+"\"",
            (answer) => { // click on ok
                if(answer === this._confirm_delete_text()){
                    this.setState({icon: 'loading'});
                    this.props.emit(
                        'file.delete',
                        pathBuilder(this.props.path, this.props.file.name, this.props.file.type),
                        this.props.file.type
                    );
                    return Promise.resolve();
                }else{
                    return Promise.reject("Doesn't match");
                }
            },
            () => { /* click on cancel */ });
    }
    onDeleteConfirm(answer){
        if(answer === this._confirm_delete_text()){
            this.setState({icon: 'loading', delete_request: false});
            this.props.emit(
                'file.delete',
                pathBuilder(this.props.path, this.props.file.name, this.props.file.type),
                this.props.file.type
            );
        }else{
            this.setState({delete_error: "Doesn't match"});
        }
    }
    onDeleteCancel(){
        this.setState({delete_request: false});
    }

    onShareRequest(filename){
        alert.now(
            <ShareComponent path={this.props.file.path}/>,
            (ok) => {}
        );
    }

    _confirm_delete_text(){
        return this.props.file.name.length > 16? this.props.file.name.substring(0, 10).toLowerCase() : this.props.file.name;
    }

    render(highlight){
        const { connectDragSource, connectDropFile, connectDropNativeFile } = this.props;
        let className = "";
        if(this.props.isDragging) {
            className += "is-dragging ";
        }
        if((this.props.fileIsOver && this.props.canDropFile) || (this.props.nativeFileIsOver && this.props.canDropNativeFile)) {
            className += "file-is-hover ";
        }
        if(this.state.is_renaming){
            className += "highlight ";
        }
        if(this.props.file.icon === 'loading'){
            className += "loading ";
        }
        if(this.state.preview){
            className += "preview ";
        }
        className = className.trim();

        return connectDragSource(connectDropNativeFile(connectDropFile(
            <div className={"component_thing view-"+this.props.view}>
              <Link to={this.props.file.link + location.search}>
                <Card ref="$card"className={this.state.hover} className={className}>
                  <Image preview={this.state.preview} icon={this.props.file.icon || this.props.file.type} view={this.props.view} path={path.join(this.props.path, this.props.file.name)} />
                  <Filename filename={this.props.file.name} filesize={this.props.file.size} filetype={this.props.file.type} onRename={this.onRename.bind(this)} is_renaming={this.state.is_renaming} onRenameCancel={this.onRenameRequest.bind(this, false)}/>
                  <DateTime show={this.state.icon !== 'loading'} timestamp={this.props.file.time} />
                  <ActionButton onClickRename={this.onRenameRequest.bind(this)} onClickDelete={this.onDeleteRequest.bind(this)} onClickShare={this.onShareRequest.bind(this)} is_renaming={this.state.is_renaming} can_rename={this.props.metadata.can_rename !== false} can_delete={this.props.metadata.can_delete !== false} can_share={this.props.metadata.can_share !== false} />
                </Card>
              </Link>
            </div>
        )));
    }
}
ExistingThing.PropTypes = {
    connectDragSource: PropTypes.func.isRequired,
    isDragging: PropTypes.bool.isRequired,
    fileIsOver: PropTypes.bool.isRequired,
    nativeFileIsOver: PropTypes.bool.isRequired,
    canDropFile: PropTypes.bool.isRequired,
    canDropNativeFile: PropTypes.bool.isRequired
}

class Filename extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            filename: props.filename
        };
    }


    onInputFocus(e){
        let value = e.target.value.split(".");
        if(value.length > 1){
            value.pop();
        }
        value = value.join(".");
        e.target.setSelectionRange(0, value.length);
    }

    onRename(e){
        e.preventDefault();
        e.stopPropagation();
        this.props.onRename(this.state.filename);
    }

    onCancel(){
        this.setState({filename: this.props.filename});
        this.props.onRenameCancel();
    }

    preventSelect(e){
        e.preventDefault();
    }

    render(){
        return (
            <span className="component_filename">
              <span className="file-details">
                <NgIf cond={this.props.is_renaming === false} type='inline'>
                  {this.state.filename} <FileSize type={this.props.filetype} size={this.props.filesize} />
                </NgIf>
                <NgIf cond={this.props.is_renaming === true} type='inline'>
                  <form onClick={this.preventSelect} onSubmit={this.onRename.bind(this)}>
                    <input value={this.state.filename} onChange={(e) => this.setState({filename: e.target.value})} onBlur={this.onCancel.bind(this)} onFocus={this.onInputFocus.bind(this)} autoFocus />
                  </form>
                </NgIf>
              </span>
            </span>
        );
    }
}

const ActionButton = (props) => {
    const onRename = (e) => {
        e.preventDefault();
        props.onClickRename();
    };

    const onDelete = (e) => {
        e.preventDefault();
        props.onClickDelete();
    };

    const onShare = (e) => {
        e.preventDefault();
        props.onClickShare();
    };

    return (
        <div className="component_action">
          <NgIf cond={props.can_rename !== false && props.is_renaming === false} type="inline">
            <Icon name="edit" onClick={onRename} className="component_updater--icon" />
          </NgIf>
          <NgIf cond={props.can_delete !== false} type="inline">
            <Icon name="delete" onClick={onDelete} className="component_updater--icon"/>
          </NgIf>
          <NgIf cond={props.can_share !== false} type="inline">
            <Icon name="share" onClick={onShare} className="component_updater--icon"/>
          </NgIf>
        </div>
    );
}

const DateTime = (props) => {
    function displayTime(timestamp){
        if(timestamp){
            let t = new Date(timestamp);
            return t.getFullYear() + "-" + leftPad(t.getMonth().toString(), 2) + "-" + leftPad(t.getDate().toString(), 2);
        }else{
            return '';
        }
    }

    if(props.show === false){
        return null;
    }

    return (
        <span className="component_datetime">
          <span>{displayTime(props.timestamp)}</span>
        </span>
    );
};

const FileSize = (props) => {
    function displaySize(bytes){
        if(Number.isNaN(bytes) || bytes === undefined){
            return "";
        }else if(bytes < 1024){
            return "("+bytes+'B'+")";
        }else if(bytes < 1048576){
            return "("+Math.round(bytes/1024*10)/10+'KB'+")";
        }else if(bytes < 1073741824){
            return "("+Math.round(bytes/(1024*1024)*10)/10+'MB'+")";
        }else if(bytes < 1099511627776){
            return "("+Math.round(bytes/(1024*1024*1024)*10)/10+'GB'+")";
        }else{
            return "("+Math.round(bytes/(1024*1024*1024*1024))+'TB'+")";
        }
    }

    return (
        <NgIf type="inline" className="component_filesize" cond={props.type === 'file'}>
          <span>{displaySize(props.size)}</span>
        </NgIf>
    );
};

const Message = (props) => {
    return (
        <NgIf cond={props.message !== null} className="component_message" type="inline">
          - {props.message}
        </NgIf>
    );
};


class Image extends React.Component{
    constructor(props){
        super(props);
    }

    render(){
        if(this.props.preview && this.props.view === "grid"){
            return (
                <span>
                  <div className="image_layer"></div>
                  <LazyLoadImage scroller=".scroll-y" className="thumbnail" src={this.props.preview} />
                </span>
            );
        }

        const ext = path.extname(this.props.path).replace(/^\./, "");
        const img = this.props.icon === "file" ? "file" : "folder";
        return (
            <span>
              <Icon name={this.props.icon} />
              <NgIf cond={!!ext && this.props.view === "grid" && this.props.icon === "file"} className="info_extension">
                <span>{ext}</span>
              </NgIf>
            </span>
        );
    }
};


class LazyLoadImage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            appear: false,
            error: false
        };
        this.$scroll = document.querySelector(props.scroller);
        this.onScroll = debounce(this.onScroll.bind(this), 250);
    }

    componentDidMount(){
        if(!this.$scroll){ throw("No scroll detected on LazyLoadImage"); }
        this.$scroll.addEventListener("scroll", this.onScroll, {passive: true});
        this.onScroll();
    }
    componentWillUnmount(){
        this.$scroll.removeEventListener("scroll", this.onScroll);
    }

    onScroll(){
        if(!this.refs.$el) return this.componentWillUnmount();
        const dim_el = this.refs.$el.getBoundingClientRect();
        if(dim_el.top + dim_el.height > 0 && dim_el.top < window.innerHeight){
            this.componentWillUnmount();
            memory.set(this.props.src, true);
            this.setState({appear: true});
        }
    }

    onError(){
        this.setState({error: true});
    }

    render(){
        if((this.props.preview || memory.get(this.props.src) === null) || this.state.error === true){
            return (
                <img ref="$el" className={this.props.className} src={img_placeholder} />
            );
        }
        return (
            <img onError={this.onError.bind(this)} className={this.props.className} src={this.props.src} />
        );
    }
}
