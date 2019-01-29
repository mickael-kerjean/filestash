import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import { MenuBar } from './menubar';
import { Container, FormBuilder, NgIf, Icon, Fab } from '../../components/';
import './formviewer.scss';

export class FormViewer extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            form: {}
        };
    }

    componentDidMount(){
        this.setState({form: JSON.parse(this.props.content)});
    }

    onChange(){
        this.setState({refresh: Math.random()});
        if(JSON.stringify(this.state.form) === this.props.content){
            this.props.needSavingUpdate(false);
        } else {
            this.props.needSavingUpdate(true);
        }
    }

    save(){
        if(this.props.needSaving === false) return;
        let blob = new window.Blob([JSON.stringify(this.state.form)], {type : 'text/plain'});
        return this.props
            .onSave(blob)
            .then(() => this.props.needSavingUpdate(false));
    }

    render(){
        return (
            <div className="component_formviewer">
              <MenuBar title={this.props.filename} download={this.props.data} />
              <div className="formviewer_container">
                <Container>
                  <form className="sticky box">
                    <FormBuilder form={this.state.form} onChange={this.onChange.bind(this)} render={ ($input, props, struct, onChange) => {
                          return (
                              <label className={"no-select"}>
                                <div>
                                  <span>
                                    { struct.label }<span className="mandatory">{struct.required ? "*" : ""}</span>
                                  </span>
                                  <div style={{width: '100%'}}>
                                    { $input }
                                  </div>
                                </div>
                                <div>
                                  <span className="nothing"></span>
                                  <div style={{width: '100%'}}>
                                    { struct.description ? (<div className="description">{struct.description}</div>) : null }
                              </div>
                                  </div>
                              </label>
                          );
                    }}/>
                  </form>
                </Container>
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
              </div>
            </div>
        );
    }
}
