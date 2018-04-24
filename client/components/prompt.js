import React from 'react';
import PropTypes from 'prop-types';

import { Input, Button, Modal, NgIf } from './';
import { prompt } from '../helpers/';

export class ModalPrompt extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            appear: false,
            value: ''
        };
        this.onCancel = this.onCancel.bind(this);
        this.onSubmit = this.onSubmit.bind(this);
    }

    componentDidMount(){
        prompt.subscribe((text, okCallback, cancelCallback, type) => {
            this.setState({
                appear: true,
                value: '',
                error: null,
                type: type || 'text',
                text: text || '',
                fns: {ok: okCallback, cancel: cancelCallback}
            });
        });
    }


    onCancel(){
        this.setState({appear: false});
        this.state.fns && this.state.fns.cancel();
    }

    onSubmit(e){
        e && e.preventDefault && e.preventDefault();
        this.state.fns.ok(this.state.value)
            .then(() => this.setState({appear: false}))
            .catch((message) => this.setState({error: message}));
    }

    onEscapeKeyPress(e){
        if(e.keyCode === 27 && this.state.fns){ this.onCancel(); }
    }

    render() {
        return (
            <Modal isActive={this.state.appear} onQuit={this.onCancel}>
              <div className="component_prompt">
                <p className="modal-message">
                  {this.state.text}
                </p>
                <form onSubmit={this.onSubmit}>
                <Input autoFocus={true} value={this.state.value} type={this.state.type} autoComplete="new-password" onChange={(e) =>  this.setState({value: e.target.value})} />
                  <div className="modal-error-message">{this.state.error}&nbsp;</div>
                  <div className="buttons">
                    <Button type="button" onClick={this.onCancel}>CANCEL</Button>
                    <Button type="submit" theme="secondary" onClick={this.onSubmit}>OK</Button>
                  </div>
                </form>
              </div>
            </Modal>
        );
    }
}
