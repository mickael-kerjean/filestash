import React from 'react';
import { MenuBar } from './menubar';
import { Container, FormBuilder } from '../../components/';
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
                                    { struct.label }:
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
                </div>
            </div>
        );
    }
}
