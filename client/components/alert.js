import React from 'react';
import PropTypes from 'prop-types';

import { Input, Button, Modal, NgIf } from './';
import './prompt.scss';

export class Alert extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            modal_appear: false
        };
    }

    onSubmit(e){
        e.preventDefault();
        this.props.onConfirm();
        this.setState({modal_appear: false});
    }

    render() {
        return (
            <Modal isActive={this.state.modal_appear} onQuit={this.onSubmit.bind(this)}>
              <div className="component_alert">
                <p>
                  {this.props.message}
                </p>
                <form id="key_manager" onSubmit={this.onSubmit.bind(this)}>
                  <div className="buttons">
                    <Button type="submit" onClick={this.onSubmit.bind(this)}>OK</Button>
                  </div>
                </form>
              </div>
            </Modal>
        );
    }
}

Alert.propTypes = {
    message: PropTypes.string.isRequired,
    onConfirm: PropTypes.func
};
