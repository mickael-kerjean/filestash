import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import { withRouter } from 'react-router';
import { Prompt } from "react-router-dom";
import { Subject } from 'rxjs/Subject';

import { NgIf, Fab, Icon } from '../../components/';
import { confirm } from '../../helpers/';
import { Editor } from './editor';
import { MenuBar } from './menubar';
import { OrgTodosViewer, OrgEventsViewer } from './org_viewer';


import './ide.scss';

@withRouter
export class IDE extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            event: new Subject(),
            contentToSave: props.content,
            appear_agenda: false,
            appear_todo: false,
            mode: null,
            folding: null
        };
    }

    componentDidMount(){
        this.unblock = this.props.history.block((nextLocation)=>{
            if(this.props.needSaving === false) return true;
            confirm.now(
                <div style={{textAlign: "center", paddingBottom: "5px"}}>
                  Do you want to save the changes ?
                </div>,
                () =>{
                    return this.save()
                        .then(() => this.props.history.push(nextLocation));
                },
                () => {
                    this.props.needSavingUpdate(false)
                        .then(() => this.props.history.push(nextLocation));
                }
            );
            return false;
        });
    }
    componentWillUnmount(){
        this.unblock();
    }

    save(){
        if(this.props.needSaving === false) return;

        let file, blob = new window.Blob([this.state.contentToSave], {type : 'text/plain'});
        try{
            file = new window.File([blob], 'test.txt');
        }catch(err){
            // for crappy browser:
            // https://stackoverflow.com/questions/33821631/alternative-for-file-constructor-for-safari
            file = blob;
        }
        return this.props.onSave(file).then(() => this.props.needSavingUpdate(false));
    }

    onUpdate(property, refresh, value){
        this.setState({ [property]: value }, () => {
            if(refresh){
                this.state.event.next(["refresh"]);
            }
            if(this.props.content === this.state.contentToSave){
                this.props.needSavingUpdate(false);
            }else{
                this.props.needSavingUpdate(true);
            }
        });
    }


    /* Org Viewer specific stuff */
    toggleAgenda(force = null){
        this.setState({appear_agenda: force === null ? !this.state.appear_agenda : !!force});
    }
    toggleTodo(force = null){
        this.setState({appear_todo: force === null ? !this.state.appear_todo : !!force});
    }
    onModeChange(){
        this.state.event.next(["fold"]);
    }
    goTo(lineNumber){
        this.state.event.next(["goTo", lineNumber]);
    }

    render(){
        return (
            <div className="component_ide no-select">
              <MenuBar title={this.props.filename} download={this.props.url}>
                <NgIf type="inline" cond={this.state.mode === 'orgmode'}>
                  <span onClick={this.onModeChange.bind(this)}>
                    <NgIf cond={this.state.folding === "SHOW_ALL"} type="inline">
                      <Icon name="arrow_up_double"/>
                    </NgIf>
                    <NgIf cond={this.state.folding === "OVERVIEW"} type="inline">
                      <Icon name="arrow_down"/>
                    </NgIf>
                    <NgIf cond={this.state.folding === "CONTENT"} type="inline">
                      <Icon name="arrow_down_double"/>
                    </NgIf>
                  </span>

                  <span onClick={this.toggleAgenda.bind(this)}>
                    <Icon name="calendar_white"/>
                  </span>
                  <span onClick={this.toggleTodo.bind(this)}>
                    <Icon name="todo_white"/>
                  </span>
                </NgIf>
              </MenuBar>

              <ReactCSSTransitionGroup transitionName="editor" transitionAppear={true} transitionEnter={false} transitionLeave={false} transitionAppearTimeout={300} className="editor_container">
                <Editor onSave={this.save.bind(this)} filename={this.props.filename}
                        content={this.state.contentToSave}
                        event={this.state.event.asObservable()}
                        onModeChange={this.onUpdate.bind(this, 'mode', false)}
                        onFoldChange={this.onUpdate.bind(this, 'folding', false)}
                        onChange={this.onUpdate.bind(this, 'contentToSave', false)} />
              </ReactCSSTransitionGroup>

              <ReactCSSTransitionGroup transitionName="fab" transitionLeave={true} transitionEnter={true} transitionAppear={true} transitionAppearTimeout={400} transitionEnterTimeout={400} transitionLeaveTimeout={200}>
                <NgIf key={this.props.needSaving} cond={this.props.needSaving}>
                  <NgIf cond={!this.props.isSaving}>
                    <Fab onClick={this.save.bind(this)}><Icon name="save" style={{height: '100%', width: '100%'}}/></Fab>
                  </NgIf>
                  <NgIf cond={this.props.isSaving}>
                    <Fab><Icon name="loading" style={{height: '100%', width: '100%'}}/></Fab>
                  </NgIf>
                </NgIf>
              </ReactCSSTransitionGroup>

              <OrgEventsViewer isActive={this.state.appear_agenda} content={this.state.contentToSave}
                               onUpdate={this.onUpdate.bind(this, "contentToSave", true)} goTo={this.goTo.bind(this)}
                               onQuit={this.toggleAgenda.bind(this, false)} />
              <OrgTodosViewer isActive={this.state.appear_todo} content={this.state.contentToSave}
                              onUpdate={this.onUpdate.bind(this, "contentToSave", true)} goTo={this.goTo.bind(this)}
                              onQuit={this.toggleTodo.bind(this, false)} />
            </div>
        );
    }
}
