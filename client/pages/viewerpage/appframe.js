import React from 'react';

import { MenuBar } from './menubar';
import { currentShare } from '../../helpers/';
import './appframe.scss';

export class AppFrame extends React.Component{
    constructor(props){
        super(props);
    }

    render(){
        let error = null;
        if(!this.props.args) {
            error = "Missing configuration. Contact your administrator";
        } else if(!this.props.args.endpoint) {
            error = "Missing endpoint configuration. Contact your administrator";
        }
        if(error !== null) return (
            <div className="component_appframe">
              <div className="error">{error}</div>
            </div>
        );
        return (
            <div className="component_appframe">
              <iframe src={this.props.args.endpoint + "?path=" + this.props.data + "&share=" + currentShare()} />
            </div>
        );
    }
}
