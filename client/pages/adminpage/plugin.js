import React from 'react';
import { Plugin } from '../../model/';

import './plugin.scss';

const PluginBox = (props) => {
    return (
        <div className="component_pluginbox">
          <div className="title">{props.name}</div>
          <div>{props.description}</div>
        </div>
    );
};

export class PluginPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            plugins: []
        };
    }

    componentDidMount(){
        Plugin.all().then((list) => this.setState({plugins: list}));
    }

    render(){
        return (
            <div className="component_plugin">
              <h2>Plugins</h2>
              <div>
                {
                    this.state.plugins.map((plugin, index) => {
                        return ( <PluginBox key={index} name={plugin.name} author={plugin.author} description={plugin.description} /> );
                    })
                }
              </div>
            </div>
        );
    }
}
