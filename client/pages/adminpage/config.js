import React from 'react';
import { FormBuilder } from '../../components/';
import { Config } from '../../model/';
import { format }  from '../../helpers';

export class ConfigPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            form: {}
        };
    }

    componentDidMount(){
        Config.all().then((c) => {
            delete c.constant; // The constant key contains read only global variable that are
                               // application wide truth => not editable from the admin area
            this.setState({form: c});
        });
    }

    format(name){
        if(typeof name !== "string"){
            return "N/A";
        }
        return name
            .split("_")
            .map((word) => {
                if(word.length < 1){
                    return word;
                }
                return word[0].toUpperCase() + word.substring(1);
            })
            .join(" ");
    }

    onChange(form){
        form.connections = window.CONFIG.connections;
        Config.save(form);
        this.setState({refresh: Math.random()});
    }

    render(){
        return (
            <form className="sticky">
                <FormBuilder form={this.state.form} onChange={this.onChange.bind(this)} render={ ($input, props, struct, onChange) => {
                    return (
                        <label className={"no-select input_type_" + props.params["type"]}>
                          <div>
                            <span>
                              { format(struct.label) }:
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
        );
    }
}
