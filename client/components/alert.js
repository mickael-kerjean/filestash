import React from 'react';
import PropTypes from 'prop-types';

import { Input, Button, Modal, NgIf } from './';
import { alert } from '../helpers/'
import "./alert.scss";

export class AlertModal extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            appear: false,
            value: null,
            fns: {}
        };
        this.onSubmit = this.onSubmit.bind(this);
    }

    componentDidMount(){
        alert.subscribe((Component, okCallback) => {
            this.setState({
                appear: true,
                value: Component,
                fns: {ok: okCallback || function(){}}
            });
        });
    }

    onSubmit(e){
        e && e.preventDefault && e.preventDefault();
        this.state.fns.ok();
        this.setState({appear: false});
    }

    onEscapeKeyPress(e){
        if(e.keyCode === 27 && this.state.fns){ this.onSubmit(); }
    }


    render() {
        return (
            <Modal isActive={this.state.appear} onQuit={this.onSubmit.bind(this)}>
              <div className="component_alert">
                <div className="modal-message">
                  {this.state.value}
                </div>
                <div className="buttons">
                  <Button type="submit" theme="secondary" onClick={this.onSubmit}>OK</Button>
                </div>
              </div>
            </Modal>
        );
    }
}
