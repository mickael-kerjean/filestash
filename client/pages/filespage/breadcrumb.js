import React from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';

import { EventEmitter, BreadCrumb, PathElement } from '../../components/';
import { pathBuilder } from '../../helpers/';

export class BreadCrumbTargettable extends BreadCrumb {
    constructor(props){
        super(props);
    }

    render(){
        return super.render(Element);
    }
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
        let files = monitor.getItem();
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
