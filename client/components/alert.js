import React from 'react';
import PropTypes from 'prop-types';

import { Input, Button, Modal, NgIf } from './';
import { alert } from '../helpers/';
import { Popup } from './popup';

export class ModalAlert extends Popup {
    constructor(props){
        super(props);
    }

    componentDidMount(){
        alert.subscribe((Component, okCallback) => {
            this.setState({
                appear: true,
                value: Component
            });
        });
    }

    onSubmit(e){
        this.setState({appear: false});
    }

    modalContentBody(){
        return (
            <div className="modal-message">
              {this.state.value}
            </div>
        );
    }

    modalContentFooter(){
        return (
            <Button type="submit" theme="secondary" onClick={this.onSubmit.bind(this)}>OK</Button>
        );
    }
}
