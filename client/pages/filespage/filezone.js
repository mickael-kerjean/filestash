import React from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';

import { EventEmitter }  from '../../components/';
import './filezone.scss';

@EventEmitter
@DropTarget('__NATIVE_FILE__', {
    drop(props, monitor){
        props.emit('file.upload', props.path, monitor.getItem());
    }
}, (connect, monitor) => ({
    connectDropFile: connect.dropTarget(),
    fileIsOver: monitor.isOver()
}))
export class FileZone extends React.Component{
    constructor(props){
        super(props);
    }

    render(){
        return this.props.connectDropFile(
            <div className={"component_filezone "+(this.props.fileIsOver ? "hover" : "")}>
              DROP HERE TO UPLOAD
            </div>
        );
    }
}

FileZone.PropTypes = {
    path: PropTypes.string.isRequired
}
