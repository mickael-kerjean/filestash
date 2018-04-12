import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { DragSource, DropTarget } from 'react-dnd';

import './thing.scss';
import { Card, NgIf, Icon, EventEmitter } from '../../components/';
import { pathBuilder, prompt } from '../../helpers/';

const fileSource = {
    beginDrag(props, monitor, component) {
        return {
            path: props.path,
            name: props.file.name,
            type: props.file.type
        };
    },
    canDrag(props, monitor){
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
        if(props.file.type === 'directory' && file.name !== props.file.name){
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
        let files = monitor.getItem().files;
        let path = pathBuilder(props.path, props.file.name, 'directory');
        props.emit('file.upload', path, files);
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
            message: null,
            filename: props.file.name,
            is_renaming: false
        };
    }

    onRename(newFilename){
        this.props.emit(
            'file.rename',
            pathBuilder(this.props.path, this.props.file.name),
            pathBuilder(this.props.path, newFilename),
            this.props.file.type
        );
        this.setState({is_renaming: false});
    }

    onRenameRequest(){
        this.setState({is_renaming: !this.state.is_renaming});
    }

    onDeleteRequest(filename){
        prompt.now(
            "Confirm by tapping \""+this._confirm_delete_text()+"\"",
            (answer) => { // click on ok
                if(answer === this._confirm_delete_text()){
                    this.setState({icon: 'loading'});
                    this.props.emit(
                        'file.delete',
                        pathBuilder(this.props.path, this.props.file.name),
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
                pathBuilder(this.props.path, this.props.file.name),
                this.props.file.type
            );
        }else{
            this.setState({delete_error: "Doesn't match"});
        }
    }
    onDeleteCancel(){
        this.setState({delete_request: false});
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
        className = className.trim();

        return connectDragSource(connectDropNativeFile(connectDropFile(
            <div className="component_thing">
              <Link to={this.props.file.link}>
                <Card className={this.state.hover} className={className}>
                  <Icon name={this.props.file.icon || this.props.file.type} />
                  <Filename filename={this.props.file.name} filesize={this.props.file.size} filetype={this.props.file.type} onRename={this.onRename.bind(this)} is_renaming={this.state.is_renaming} />
                  <Message message={this.state.message} />
                  <DateTime show={this.state.icon !== 'loading'} timestamp={this.props.file.time} />
                  <ActionButton onClickRename={this.onRenameRequest.bind(this)} onClickDelete={this.onDeleteRequest.bind(this)} can_move={this.props.file.can_move !== false} can_delete={this.props.file.can_delete !== false} />
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

    onRename(e){
        e.preventDefault();
        e.stopPropagation();
        this.props.onRename(this.state.filename);
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
                    <input value={this.state.filename} onChange={(e) => this.setState({filename: e.target.value})} autoFocus />
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

    return (
        <div className="component_action">
          <NgIf cond={props.can_move === true} type="inline">
            <Icon name="edit" onClick={onRename} className="component_updater--icon" />
          </NgIf>
          <NgIf cond={props.can_delete === true} type="inline">
            <Icon name="delete" onClick={onDelete} className="component_updater--icon"/>
          </NgIf>
        </div>
    );
}

const DateTime = (props) => {
    function displayTime(timestamp){
        function padding(number){
            let str = String(number),
                pad = "00";
            return pad.substring(0, pad.length - str.length) + str;
        }
        if(timestamp){
            let t = new Date(timestamp);
            return padding(t.getDate()) + '/'+ padding(t.getMonth()) + '/' + padding(t.getFullYear());
        }else{
            return '';
        }
    }

    return (
        <NgIf cond={props.show} className="component_datetime">
          <span>{displayTime(props.timestamp)}</span>
        </NgIf>
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
