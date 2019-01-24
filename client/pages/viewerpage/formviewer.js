import React from 'react';
import { MenuBar } from './menubar';
import { Container, FormBuilder } from '../../components/';
import './formviewer.scss';

export class FormViewer extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            form: {
                "test": {label: "test", type: "text", "value": null, default: "polo", placeholder: "test"},
                "something": {label: "test", type: "text", "value": null, default: "polo", placeholder: "test"}
            }
        };
    }

    componentDidMount(){
        this.setState({form: JSON.parse(this.props.content)});
    }

    onChange(){
        this.setState({refresh: Math.random()});
    }

    render(){
        console.log(this.state.form);
        return (
            <div className="component_formviewer">
              <MenuBar title={this.props.filename} download={this.props.data} />
              <div className="formviewer_container">
                <Container>
                  <form className="sticky">
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
