import React from 'react';
import PropTypes from 'prop-types';

import { Input, Button, Modal, NgIf } from './';
import "./alert.scss";

export class Alert extends React.Component {
    constructor(props){
        super(props);
    }

    onSubmit(e){
        e && e.preventDefault && e.preventDefault();
        this.props.onConfirm && this.props.onConfirm();
    }

    render() {
        return (
            <Modal isActive={this.props.appear} onQuit={this.onSubmit.bind(this)}>
              <div className="component_alert">
                <p className="modal-message">
                  {this.props.message}
                </p>
                <form onSubmit={this.onSubmit.bind(this)}>
                  <div className="buttons">
                    <Button type="submit" theme="secondary" onClick={this.onSubmit.bind(this)}>OK</Button>
                  </div>
                </form>
              </div>
            </Modal>
        );
    }
}

Alert.propTypes = {
    appear: PropTypes.bool.isRequired,
    message: PropTypes.string.isRequired,
    onConfirm: PropTypes.func
};
