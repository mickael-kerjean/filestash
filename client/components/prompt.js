import React from 'react';
import PropTypes from 'prop-types';

import { Input, Button, Modal, NgIf } from './';

export class Prompt extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            error: this.props.error,
            value: ''
        };
        if(this.props.error) window.setTimeout(() => this.setState({error: ''}), 2000);
    }

    componentWillReceiveProps(props){
        if(props.error !== this.state.error){
            this.setState({error: props.error});
            window.setTimeout(() => this.setState({error: ''}), 2000);
        }
    }

    onCancel(should_clear){
        if(this.props.onCancel) this.props.onCancel();
    }

    onSubmit(e){
        e && e.preventDefault && e.preventDefault();
        if(this.props.onSubmit) this.props.onSubmit(this.state.value);
    }

    onInputChange(value){
        this.setState({value: value});
    }

    render() {
        return (
            <Modal isActive={this.props.appear} onQuit={this.onCancel.bind(this)}>
              <div className="component_prompt">
                <p className="modal-message">
                  {this.props.message}
                </p>
                <form onSubmit={this.onSubmit.bind(this)}>
                  <Input autoFocus={true} value={this.state.value} type={this.props.type || 'text'} autoComplete="new-password" onChange={(e) => this.onInputChange(e.target.value)} />

                  <div className="modal-error-message">{this.state.error}&nbsp;</div>

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
    appear: PropTypes.bool.isRequired,
    type: PropTypes.string,
    message: PropTypes.string.isRequired,
    error: PropTypes.string,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
};
