import React from 'react';
import PropTypes from 'prop-types';
import { DropTarget, DragSource } from 'react-dnd';
import { NgIf } from './';

import './uploader.scss';

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
        return this.props.connectDropTarget(
            <div>
              <NgIf cond={this.props.isOver && this.props.canDrop}>
                DRAG FILE HERE
              </NgIf>
              <div className="component_uploader">
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
