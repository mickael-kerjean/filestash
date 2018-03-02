import React from 'react';
import PropTypes from 'prop-types';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import { Input, Button, NgIf, Modal } from '../../components/';
import { encrypt, decrypt, memory } from '../../helpers/';
import './credentials.scss';

export class Credentials extends React.Component {
    constructor(props){
        super(props);
        const key = memory.get('credentials_key') || '';
        this.state = {
            modal_appear: key ? false : this.props.remember_me,
            key: key || '',
            message: null,
            error: null
        };
        // we use a clojure for the "key" because we want to persist it in memory
        // not just in the state which is kill whenever react decide
    }

    componentWillReceiveProps(new_props){
        if(new_props.remember_me === false){
            window.localStorage.clear();
        }else if(new_props.remember_me === true){
            this.saveCreds(new_props.credentials);
        }

        if(new_props.remember_me === true && this.props.remember_me === false){
            this.setState({modal_appear: true});
            this.init();
        }else if(new_props.remember_me === false && this.props.remember_me === true){
            memory.set('credentials_key', '');
            this.setState({modal_appear: false, key: ''});
        }
    }

    componentDidMount(){
        this.init();
        if(this.state.key) this.onSubmit();
    }

    init(){
        let raw = window.localStorage.hasOwnProperty('credentials');
        if(raw){
            this.setState({message: "Your Master Password:"});
        }else{
            this.setState({message: "Pick a Master Password:"});
        }
    }

    saveCreds(creds){
        const key = memory.get('credentials_key');
        if(key){
            window.localStorage.setItem('credentials', encrypt(creds, key));
        }
    }

    onKeyChange(e){
        this.setState({key: e.target.value});
        memory.set('credentials_key', e.target.value);
    }

    onCancel(should_clear){
        memory.set('credentials_key', '');
        this.setState({modal_appear: false, key: ''});
    }

    onSubmit(e){
        e && e.preventDefault();
        /*
         * 2 differents use cases:
         * - a user is creating a new master password
         * - a user want to unlock existing credentials
         */
        const key = memory.get('credentials_key');
        if(key !== ''){
            let raw = window.localStorage.getItem('credentials');
            if(raw){
                try{
                    let credentials = decrypt(raw, key);
                    this.setState({modal_appear: false});
                    this.props.onCredentialsFound(credentials);
                }catch(e){
                    this.setState({error: 'Incorrect password'});
                }
            }else{
                this.saveCreds(this.props.credentials);
                this.setState({modal_appear: false});
            }
        }else{
            this.setState({error: 'Password can\'t be empty'});
            window.setTimeout(() => this.setState({error: null}), 1500);
        }
    }

    render() {
        return (
            <Modal isActive={this.state.modal_appear} onQuit={this.onCancel.bind(this)}>
              <div className="component_password">
                <p>
                  {this.state.message}
                </p>
                <form id="key_manager" onSubmit={this.onSubmit.bind(this)}>
                  <Input autoFocus={true} value={this.state.key} type="password" onChange={this.onKeyChange.bind(this)} autoComplete="new-password" />

                  <div key={this.state.error} className="error">{this.state.error}&nbsp;</div>

                  <div className="buttons">
                    <Button type="button" onClick={this.onCancel.bind(this)}>CANCEL</Button>
                    <Button type="submit" theme="secondary">OK</Button>
                  </div>
                </form>
              </div>
            </Modal>
        );
    }
}

Credentials.propTypes = {
};
