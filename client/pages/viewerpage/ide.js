import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import { NgIf, Fab, Icon } from '../../components/';
import { Editor } from './editor';
import { MenuBar } from './menubar';

import './ide.scss';

export class IDE extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            contentToSave: props.content,
            needSaving: false
        };
    }

    onContentUpdate(text){
        this.props.needSaving(true);
        this.setState({contentToSave: text, needSaving: true});
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
        this.props.onSave(file)
            .then(() => this.setState({needSaving: false}));
    }

    render(){
        return (
            <div style={{height: '100%'}}>
              <MenuBar title={this.props.filename} download={this.props.url} />
              <Editor onSave={this.save.bind(this)} filename={this.props.filename} content={this.props.content} onChange={this.onContentUpdate.bind(this)} />

              <ReactCSSTransitionGroup transitionName="fab" transitionLeave={true} transitionEnter={true} transitionAppear={true} transitionAppearTimeout={300} transitionEnterTimeout={300} transitionLeaveTimeout={200}>
                <NgIf key={this.state.needSaving} cond={this.state.needSaving}>
                  <NgIf cond={!this.props.isSaving}>
                    <Fab onClick={this.save.bind(this)}><Icon name="save" style={{height: '100%', width: '100%'}}/></Fab>
                  </NgIf>
                  <NgIf cond={this.props.isSaving}>
                    <Fab><Icon name="loading_white" style={{height: '100%', width: '100%'}}/></Fab>
                  </NgIf>
                </NgIf>
              </ReactCSSTransitionGroup>
            </div>
        );
    }
}
