import React from 'react';
import PropTypes from 'prop-types';

import { Input, Button, Modal, NgIf } from './';
import './prompt.scss';

export class Prompt extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            modal_appear: false,
            error: ''
        };
    }

    componentWillReceiveProps(props){
        if(props.error !== this.state.error){
            this.setState({error: props.error});
        }
    }

    onCancel(should_clear){
        this.setState({modal_appear: false});
    }

    onSubmit(e){
    }

    render() {
        return (
            <Modal isActive={this.state.modal_appear} onQuit={this.onCancel.bind(this)}>
              <div className="component_prompt">
                <p className="message">
                  {this.props.message}
                </p>
                <form onSubmit={this.onSubmit.bind(this)}>
                  <Input autoFocus={true} value={this.state.key} type={this.props.type || 'text'} onChange={this.onKeyChange.bind(this)} autoComplete="new-password" />

                  <div className="error">{this.props.error}&nbsp;</div>

                  <div className="buttons">
                    <Button type="button" onClick={this.onCancel.bind(this)}>CANCEL</Button>
                    <Button type="submit" theme="secondary" onClick={this.onSubmit.bind(this)}>OK</Button>
                  </div>
                </form>
              </div>
            </Modal>
        );
    }
}

Prompt.propTypes = {
    type: PropTypes.string,
    message: PropTypes.string.isRequired,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
};
