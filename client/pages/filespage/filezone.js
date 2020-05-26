import React from 'react';
import PropTypes from 'prop-types';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import { DropTarget } from 'react-dnd';

import { EventEmitter, Icon }  from '../../components/';
import { t } from '../../locales/';
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
              { t("DROP HERE TO UPLOAD") }
            </div>
        );
    }
}
FileZone.propTypes = {
    path: PropTypes.string.isRequired
}

@EventEmitter
export class MobileFileUpload extends React.Component{
    constructor(props){
        super(props);
    }

    onUpload(e){
        this.props.emit("file.upload", this.props.path, e);
    }
    render(){
        if(!window.CONFIG["upload_button"] && /(Android|iPad|iPhone)/.test(navigator.userAgent) === false){
            return null;
        }

        return (
            <ReactCSSTransitionGroup transitionName="mobilefileupload" transitionLeave={false} transitionEnter={false} transitionAppear={true} transitionAppearTimeout={550}>
              <div className="component_mobilefileupload">
                <form>
                  <input onChange={this.onUpload.bind(this)} type="file" name="file" id="mobilefileupload" multiple/>
                  <label htmlFor="mobilefileupload">
                    <Icon name="upload_white"/>
                  </label>
                </form>
              </div>
            </ReactCSSTransitionGroup>
        );
    }
}
