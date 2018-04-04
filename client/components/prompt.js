import React from 'react';
import PropTypes from 'prop-types';

import { Input, Button, Modal, NgIf } from './';
import { prompt } from '../helpers/';

export class ModalPrompt extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            appear: false
        };
    }

    componentDidMount(){
        prompt.subscribe((text, okCallback, cancelCallback, type) => {
            console.log("REQUEST FOR PROMPT");
            this.setState({
                appear: true,
                error: null,
                type: type || 'text',
                text: text || '',
                fns: {ok: okCallback, cancel: cancelCallback}
            });
        });
    }

    onCancel(){
        this.setState({appear: false});
        this.state.fns.cancelCallback();
    }

    onSubmit(e){
        e && e.preventDefault && e.preventDefault();
        this.state.fns.okCallback(this.state.value)
            .then(() => this.setState({appear: false}))
            .catch((message) => this.setState({error: message}));
    }

    render() {
        return (
            <Modal isActive={this.state.appear} onQuit={this.onCancel.bind(this)}>
              <div className="component_prompt">
                <p className="modal-message">
                  {this.state.text}
                </p>
                <form onSubmit={this.onSubmit.bind(this)}>
                <Input autoFocus={true} value={this.state.value} type={this.state.type} autoComplete="new-password" onChange={(e) =>  this.setState({value: e.target.value})} />
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
