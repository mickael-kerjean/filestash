import React from 'react';
import PropTypes from 'prop-types';
import { DragSource, DropTarget } from 'react-dnd';

import './existingthing.scss';
import { Card, NgIf, Icon, EventEmitter} from '../../components/';
import { pathBuilder } from '../../helpers/';

const fileSource = {
    beginDrag(props, monitor, component) {
        return {
            path: props.path,
            name: props.file.name,
            type: props.file.type
        };
    },
    canDrag(props, monitor){
        // would have been great to use forbid dragging while there's some actions happenning
        // but react-dnd won't give us the component in argument :(
        return true;
    },
    endDrag(props, monitor, component){
        if(monitor.didDrop() && component.state.icon !== 'loading'){
            let result = monitor.getDropResult();
            if(result.action === 'rename'){
                component.setState({icon: 'loading', message: null}, function(){
                    props.emit.apply(component, ['file.rename'].concat(result.args))
                        .then((ok) => {
                            component.setState({appear: false});
                        })
                        .catch(err => {
                            if(err && err.code === 'CANCELLED'){ return; }
                            component.setState({icon: 'error', message: err.message});
                        });
                });
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
            appear: true,
            hover: null,
            message: null,
            icon: props.file.type,
            filename: props.file.name,
            request_delete: false
        };
    }

    componentWillReceiveProps(props){
        this.setState({
            filename: props.file.name,
            message: props.file.message || null
        });
    }


    onSelect(){
        if(this.state.icon !== 'loading'){
            this.props.emit('file.select', pathBuilder(this.props.path, this.props.file.name, this.props.file.type), this.props.file.type)
                .catch((err) => {
                    if(err && err.code === 'CANCELLED'){ return; }
                    this.setState({icon: 'error', message: err.message});
                });
        }
    }

    onRename(newFilename){
        let oldFilename = this.props.file.name;
        this.setState({icon: 'loading', filename: newFilename});
        this.props.emit(
            'file.rename',
            pathBuilder(this.props.path, oldFilename),
            pathBuilder(this.props.path, newFilename),
            this.props.file.type
        )
            .then((ok) => this.props.emit('file.refresh', this.props.path))
            .catch((err) => {
                if(err && err.code === 'CANCELLED'){ return; }
                this.setState({icon: 'error', message: err.message, filename: oldFilename});
            });
    }

    onDeleteRequest(filename){
        let toConfirm = this.props.file.name.length > 16? this.props.file.name.substring(0, 10).toLowerCase() : this.props.file.name;
        let answer = prompt('Confirm by tapping "'+toConfirm+'"');
        console.log(answer);
    }
    onDeleteConfirm(filename, toConfirm, answer){
        if(answer === toConfirm){
            this.setState({icon: 'loading'});
            this.props.emit(
                'file.delete',
                pathBuilder(this.props.path, this.props.file.name),
                this.props.file.type
            ).then((ok) => {
                this.setState({appear: false});
            }).catch((err) => {
                if(err && err.code === 'CANCELLED'){ return; }
                this.setState({icon: 'error', message: err.message});
            });
        }
    }


    render(highlight){
        const { connectDragSource, connectDropFile, connectDropNativeFile } = this.props;
        let dragStyle = {whiteSpace: 'nowrap'};
        if(this.props.isDragging) { dragStyle.opacity = 0.15; }

        if(this.state.hover === true){
            dragStyle.background = '#f5f5f5';
        }
        if((this.props.fileIsOver && this.props.canDropFile) || (this.props.nativeFileIsOver && this.props.canDropNativeFile)) {
            dragStyle.background = '#c5e2f1';
        }

        return connectDragSource(connectDropNativeFile(connectDropFile(
            <div className="component_existingthing">
              <NgIf cond={this.state.appear}>
                <Card onClick={this.onSelect.bind(this)} onMouseEnter={() => this.setState({hover: true})} onMouseLeave={() => this.setState({hover: false})} style={dragStyle}>
                  <DateTime show={this.state.hover !== true || this.state.icon === 'loading'} timestamp={this.props.file.time} background={dragStyle.background}/>
                  <Updater filename={this.state.filename}
                           icon={this.props.file.virtual? this.props.file.icon : this.state.icon}
                           can_move={this.props.file.can_move !== false}
                           can_delete={this.props.file.can_delete !== false}
                           background={dragStyle.background}
                           show={this.state.hover === true && this.state.icon !== 'loading' && !('ontouchstart' in window)}
                           onRename={this.onRename.bind(this)}
                           onDelete={this.onDeleteRequest.bind(this)} />
                  <FileSize type={this.props.file.type} size={this.props.file.size} />
                  <Message message={this.state.message} />
                </Card>
              </NgIf>
              <NgIf cond={this.state.request_delete}>

              </NgIf>
            </div>
        )));
    }
}
//                 <Prompt message="" onCancel={() => {}} onConfirm={this.onDeleteConfirm.bind(this, this.state.filename, 'test')} />
ExistingThing.PropTypes = {
    connectDragSource: PropTypes.func.isRequired,
    isDragging: PropTypes.bool.isRequired,
    fileIsOver: PropTypes.bool.isRequired,
    nativeFileIsOver: PropTypes.bool.isRequired,
    canDropFile: PropTypes.bool.isRequired,
    canDropNativeFile: PropTypes.bool.isRequired
}

class Updater extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            editing: null
        };
    }

    onRename(e){
        e.preventDefault();
        this.props.onRename(this.state.editing);
        this.setState({editing: null});
    }

    onDelete(e){
        e.stopPropagation();
        this.props.onDelete();
    }


    onRenameRequest(e){
        e.stopPropagation();
        if(this.state.editing === null){
            this.setState({editing: this.props.filename});
        }else{
            this.setState({editing: null});
        }
    }


    preventSelect(e){
        e.stopPropagation();
    }

    render(){
        const style = {
            inline: {display: 'inline'},
            el: {float: 'right', color: '#6f6f6f', height: '22px', background: this.props.background || 'white', margin: '0 -10px', padding: '0 10px', position: 'relative'},
            margin: {marginRight: '10px'}
        };
        return (
            <div style={{display: 'inline'}}>
              <NgIf cond={this.props.show} style={style.el}>
                <NgIf cond={this.props.can_move} style={style.inline}>
                  <Icon name="edit" onClick={this.onRenameRequest.bind(this)} style={style.margin} style={{width: '25px', height: '25px'}} />
                </NgIf>
                <NgIf cond={this.props.can_delete !== false} style={style.inline}>
                  <Icon name="delete" onClick={this.onDelete.bind(this)} style={{width: '25px', height: '25px'}} />
                </NgIf>
              </NgIf>
              <Icon style={{width: '25px', height: '25px'}} name={this.props.icon} />
              <span style={{padding: '5px', lineHeight: '22px'}}>
                <NgIf style={{display: 'inline'}} cond={this.state.editing === null}>{this.props.filename}</NgIf>
                <NgIf style={{display: 'inline'}} cond={this.state.editing !== null}>
                  <form onClick={this.preventSelect} onSubmit={this.onRename.bind(this)} style={{display: 'inline'}}>
                    <input value={this.state.editing} onChange={(e) => this.setState({editing: e.target.value})} autoFocus />
                  </form>
                </NgIf>
              </span>
            </div>
        );
    }
}

const DateTime = (props) => {
    function displayTime(timestamp){
        function padding(number){
            let str = String(number),
                pad = "00";
            return pad.substring(0, pad.length - str.length) + str
        }
        if(timestamp){
            let t = new Date(timestamp);
            return padding(t.getDate()) + '/'+ padding(t.getMonth()) + '/' + padding(t.getFullYear());
        }else{
            return '';
        }
    }

    const style = {float: 'right', color: '#6f6f6f', lineHeight: '25px', background: props.background || 'white', margin: '0 -10px', padding: '0 10px', position: 'relative'};

    return (
        <NgIf cond={props.show} style={style}>
          <span>{displayTime(props.timestamp)}</span>
        </NgIf>
    );
}

const FileSize = (props) => {
    function displaySize(bytes){
        if(bytes < 1024){
            return bytes+'B';
        }else if(bytes < 1048576){
            return Math.round(bytes/1024*10)/10+'KB';
        }else if(bytes < 1073741824){
            return Math.round(bytes/(1024*1024)*10)/10+'MB';
        }else if(bytes < 1099511627776){
            return Math.round(bytes/(1024*1024*1024)*10)/10+'GB';
        }else{
            return Math.round(bytes/(1024*1024*1024*1024))+'TB'
        }
    }
    const style = {color: '#6f6f6f', fontSize: '0.85em'};

    return (
        <NgIf cond={props.type === 'file'} style={{display: 'inline-block'}}>
          <span style={style}>({displaySize(props.size)})</span>
        </NgIf>
    )
}
const Message = (props) => {
    const style = {color: 'rgba(0,0,0,0.4)', fontSize: '0.9em', paddingLeft: '10px', display: 'inline'};
    return (
        <NgIf cond={props.message !== null} style={style}>
          - {props.message}
        </NgIf>
    )
}
