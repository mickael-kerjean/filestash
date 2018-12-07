import React from 'react';
import { FormBuilder } from '../../components/';
import { Config } from '../../model/';

export class ConfigPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            form: {}
        };
    }

    componentWillMount(){
        Config.all().then((log) => {
            this.setState({form: log});
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
        form.connections = window.CONFIG.connections
        Config.save(form);
        this.setState({refresh: Math.random()});
    }

    render(){
        return (
            <form className="sticky">
              <FormBuilder form={this.state.form} onChange={this.onChange.bind(this)} />
            </form>
        );
    }
}
