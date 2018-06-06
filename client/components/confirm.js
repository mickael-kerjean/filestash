import React from 'react';
import PropTypes from 'prop-types';

import { Input, Button, Modal, NgIf } from './';
import { confirm } from '../helpers/';
import { Popup } from './popup';

export class ModalConfirm extends Popup{
    constructor(props){
        super(props);
    }

    componentDidMount(){
        confirm.subscribe((Component, yesCallback, noCallback) => {
            this.setState({
                appear: true,
                value: Component,
                fns: {yes: yesCallback, no: noCallback}
            });
        });
    }

    modalContentBody(){
        return (
            <div className="modal-message">
              {this.state.value}
            </div>
        );
    }

    yes(){
        if(this.state.fns && typeof this.state.fns.yes === "function"){
            this.state.fns.yes();
        }
        this.setState({appear: false});
    }
    no(){
        if(this.state.fns && typeof this.state.fns.no === "function"){
            this.state.fns.no();
        }
        this.setState({appear: false});
    }

    modalContentFooter(){
        return (
            <div>
              <Button type="button" onClick={this.no.bind(this)}>NO</Button>
              <Button type="submit" theme="secondary" onClick={this.yes.bind(this)}>YES</Button>
            </div>
        );
    }
}
