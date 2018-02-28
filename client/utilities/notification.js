import React from 'react';
import PropTypes from 'prop-types';
import { NgIf } from './';
import { theme } from './theme';

import './notification.scss';

export class Notification extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            visible: null,
            error: null,
            timeout: null
        };
    }

    componentWillMount(){
        this.componentWillReceiveProps(this.props);
    }

    componentWillUnmount(){
        window.clearTimeout(this.timeout);
    }

    componentWillReceiveProps(props){
        if(props.error !== null){
            this.componentWillUnmount();
            this.setState({visible: true, error: props.error});
            this.timeout = window.setTimeout(() => {
                this.setState({visible: null});
            }, 5000);
        }
    }

    toggleVisibility(){
        this.setState({visible: !this.state.visible});
    }

    formatError(err){
        if(typeof err === 'object'){
            if(err && err.message){
                return err.message;
            }else{
                return JSON.stringify(err);
            }
        }else if(typeof err === 'string'){
            return err;
        }else{
            throw('unrecognized notification');
        }
    }

    render(){
        return (
            <NgIf cond={this.state.visible === true}>
              <div className="component_notification">
                <div onClick={this.toggleVisibility.bind(this)}>
                  {this.formatError(this.state.error)}
                </div>
              </div>
            </NgIf>
        );
    }
}

Notification.propTypes = {
    error: PropTypes.any
}
