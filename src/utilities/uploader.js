import React from 'react';
import PropTypes from 'prop-types';
import { DropTarget, DragSource } from 'react-dnd';
import { NgIf } from './';

const FileTarget = {
    drop(props, monitor) {
        props.onUpload(props.path, monitor.getItem().files);
    }
}

@DropTarget('__NATIVE_FILE__', FileTarget, (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop()
}))
export class Uploader extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            drop: false,
            dragging: false
        };
    }

    render(){
        const style = {
            position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
            background: 'rgba(0,0,0,0.2)',
            padding: '50% 0',
            textAlign: 'center'
        }
        return this.props.connectDropTarget(
            <div>
              <NgIf cond={this.props.isOver && this.props.canDrop} style={style}>
                DRAG FILE HERE
              </NgIf>
              <div>
                {this.props.children}
              </div>
            </div>
        );
    }
}
Uploader.PropTypes = {
    path: PropTypes.string.isRequired,
    onUpload: PropTypes.func.isRequired
}
