import React from 'react';
import PropTypes from 'prop-types';
import { Modal } from './';

import './popup.scss';

export class Popup extends React.Component {
    constructor(props){
        super(props);
        if(new.target === Popup){
            throw new TypeError("Cannot construct Popup instances directly");
        }
        this.state = {
            appear: false
        };
    }

    onSubmit(e){
        e && e.preventDefault && e.preventDefault();
        this.setState({appear: false});
    }

    onCancel(){
        this.setState({appear: false});
    }


    render() {
        return (
            <Modal isActive={this.state.appear} onQuit={this.onCancel.bind(this)}>
              <div className="component_popup">
                <div className="popup--content">
                  { this.modalContentBody() }
                </div>
                <div className="buttons">
                  { this.modalContentFooter() }
                </div>
              </div>
            </Modal>
        );
    }
}
