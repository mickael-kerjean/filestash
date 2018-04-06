import React from 'react';
import PropTypes from 'prop-types';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import { ModalPrompt } from '../../components/';
import { encrypt, decrypt, memory, prompt } from '../../helpers/';

export class Credentials extends React.Component {
    constructor(props){
        super(props);
        const key = memory.get('credentials_key') || ''; // we use a clojure for the "key" because we
                                                         // want to persist it in memory, not just in the
                                                         // state which is kill whenever react decide
        this.state = {
            key: key || '',
            message: '',
            error: null
        };

        if(this.props.remember_me === true){
            if(key === ""){
                let raw = window.localStorage.hasOwnProperty('credentials');
                if(raw){
                    this.promptForExistingPassword();
                }else{
                    this.promptForNewPassword();
                }
            }else{
                this.hidrate_credentials(key);
            }
        }
    }

    componentWillReceiveProps(new_props){
        if(new_props.remember_me === false){
            window.localStorage.clear();
        }else if(new_props.remember_me === true){
            this.saveCreds(new_props.credentials);
        }

        if(new_props.remember_me === true && this.props.remember_me === false){
            this.promptForNewPassword();
        }else if(new_props.remember_me === false && this.props.remember_me === true){
            memory.set('credentials_key', '');
            this.setState({key: ''});
        }
    }

    promptForExistingPassword(){
        prompt.now(
            "Your Master Password",
            (key) => {
                if(!key.trim()) return Promise.reject("Password can\'t be empty");
                this.setState({key: key});
                memory.set('credentials_key', key);
                return this.hidrate_credentials(key);
            },
            () => {
                memory.set('credentials_key', '');
                this.setState({key: ''});
            },
            'password'
        );
    }
    promptForNewPassword(){
        prompt.now(
            "Pick a Master Password",
            (key) => {
                if(!key.trim()) return Promise.reject("Password can\'t be empty");
                memory.set('credentials_key', key);
                this.setState({key: key}, () => {
                    this.saveCreds(this.props.credentials);
                });
                return Promise.resolve();
            },
            () => {},
            'password'
        );
    }

    hidrate_credentials(key){
        let raw = window.localStorage.getItem('credentials');
        if(raw){
            try{
                let credentials = decrypt(raw, key);
                this.props.onCredentialsFound(credentials);
                return Promise.resolve();
            }catch(e){
                return Promise.reject('Incorrect password');
            }
        }else{
            this.saveCreds(this.props.credentials);
            return Promise.resolve();
        }
    }

    saveCreds(creds){
        const key = memory.get('credentials_key');
        if(key){
            window.localStorage.setItem('credentials', encrypt(creds, key));
        }
    }

    render() {
        return null;
    }
}
