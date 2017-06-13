import React from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import { EventEmitter }  from '../../data';


@EventEmitter
@DropTarget('__NATIVE_FILE__', {
    drop(props, monitor){
        let files = monitor.getItem().files
        props.emit('file.upload', props.path, files)
            .then((ok) => {
                console.log("DONE", ok)
            })
            .catch((err) => {
                console.log("ERROR", err)
            })
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
            textAlign: 'center'
        }
        if(this.props.fileIsOver){
            style.background = 'rgba(209, 255, 255,0.5)';
            style.border = '2px dashed #38a6a6';
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

