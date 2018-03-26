import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import { NgIf, Fab, Icon } from '../../components/';
import { Editor } from './editor';

import './ide.scss';

export class IDE extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            contentToSave: props.content
        };
    }

    onContentUpdate(text){
        this.props.needSaving(true);
        this.setState({contentToSave: text});
    }

    save(){
        let file, blob = new window.Blob([this.state.contentToSave], {type : 'text/plain'});
        try{
            file = new window.File([blob], 'test.txt');
        }catch(err){
            // for crappy browser:
            // https://stackoverflow.com/questions/33821631/alternative-for-file-constructor-for-safari
            file = blob;
        }
        this.props.onSave(file);
    }

    render(){
        return (
            <div style={{height: '100%'}}>
                <Editor onSave={this.save.bind(this)} filename={this.props.filename} content={this.props.content} onChange={this.onContentUpdate.bind(this)} />

                <ReactCSSTransitionGroup transitionName="fab" transitionLeave={false} transitionEnter={false} transitionAppear={true} transitionAppearTimeout={25000}>
                  <NgIf cond={!this.props.isSaving}>
                    <Fab onClick={this.save.bind(this)}><Icon name="save" style={{height: '100%', width: '100%'}}/></Fab>
                  </NgIf>
                  <NgIf cond={this.props.isSaving}>
                    <Fab><Icon name="loading_white" style={{height: '100%', width: '100%'}}/></Fab>
                  </NgIf>
                </ReactCSSTransitionGroup>
            </div>
        );
    }
}
