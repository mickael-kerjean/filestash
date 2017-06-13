import React from 'react';
import PropTypes from 'prop-types';
import { EventEmitter } from '../../data';
import { BreadCrumb, PathElement } from '../../components/breadcrumb';
import { pathBuilder } from '../../utilities';
import { DropTarget } from 'react-dnd';


export default class BreadCrumbTargettable extends BreadCrumb{
    constructor(props){
        super(props);
    }

    render(){
        return super.render(Element);
    }
}
BreadCrumbTargettable.PropTypes = {
    path: PropTypes.string.isRequred
}


const fileTarget = {
    canDrop(props){
        return props.isLast ? false : true;
    },
    drop(props, monitor, component){
        let src = monitor.getItem();
        let from = pathBuilder(src.path, src.name, src.type);
        let to = pathBuilder(props.path.full, src.name, src.type);
        return {action: 'rename', args: [from, to, src.type], ctx: 'breadcrumb'}
    }
}
const nativeFileTarget = {
    canDrop(props){
        return props.isLast ? false : true;
    },
    drop: function(props, monitor){
        let files = monitor.getItem().files;
        props.emit('file.upload', props.path.full, files);
    }    
}

@EventEmitter
@DropTarget('__NATIVE_FILE__', nativeFileTarget, (connect, monitor) => ({
    connectNativeFileDropTarget: connect.dropTarget(),
    isNativeFileOver: monitor.isOver(),
    canDropFile: monitor.canDrop()
}))
@DropTarget('file', fileTarget, (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop()
}))
class Element extends PathElement {
    constructor(props){
        super(props)
    }

    render(){
        let highlight = (this.props.isOver && this.props.canDrop ) || (this.props.isNativeFileOver && this.props.canDropFile);
        return this.props.connectNativeFileDropTarget(this.props.connectDropTarget(
            super.render(highlight)
        ));
    }
}
Element.PropTypes = {
    path: PropTypes.string.isRequred
}
