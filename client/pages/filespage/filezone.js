import React from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';

import { EventEmitter }  from '../../components/';

@EventEmitter
@DropTarget('__NATIVE_FILE__', {
    drop(props, monitor){
        let files = monitor.getItem().files
        props.emit('file.upload', props.path, files);
    }
}, (connect, monitor) => ({
    connectDropFile: connect.dropTarget(),
    fileIsOver: monitor.isOver()
}))
export class FileZone extends React.Component{
    constructor(props){
        super(props)
    }

    render(){
        let style = {
            border: '2px dashed',
            padding: '25px 0',
            marginBottom: '10px',
            textAlign: 'center',
            fontWeight: 'bold'
        }
        if(this.props.fileIsOver){
            style.background = '#B4EBFF';
            style.border = '2px dashed #9AD1ED';
            style.color = 'white'
        }
        return this.props.connectDropFile(
            <div style={style}>
              DROP HERE TO UPLOAD
            </div>
        );
    }
}
FileZone.PropTypes = {
    path: PropTypes.string.isRequired
}
