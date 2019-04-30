import React from 'react';
import PropTypes from 'prop-types';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import { ModalPrompt } from '../../components/';
import { memory, prompt, notify } from '../../helpers/';

const CREDENTIALS_CACHE = "credentials",
      CREDENTIALS_KEY = "credentials_key";

export class Credentials extends React.Component {
    constructor(props){
        super(props);
        const key = memory.get(CREDENTIALS_KEY) || ''; // we use a clojure for the "key" because we require control
                                                       // without the influence of the react component lifecycle
        this.state = {
            key: key || '',
            message: '',
            error: null
        };

        if(this.props.remember_me === true){
            if(key === ""){
                let raw = window.localStorage.hasOwnProperty(CREDENTIALS_CACHE);
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
        if(window.CONFIG["remember_me"] === false){
            window.localStorage.clear();
            return;
        } else if(new_props.remember_me === false){
            window.localStorage.clear();
        } else if(new_props.remember_me === true){
            this.saveCreds(new_props.credentials);
        }

        if(new_props.remember_me === true && this.props.remember_me === false){
            this.promptForNewPassword();
        }else if(new_props.remember_me === false && this.props.remember_me === true){
            memory.set(CREDENTIALS_KEY, '');
            this.setState({key: ''});
        }
    }

    promptForExistingPassword(){
        prompt.now(
            "Your Master Password",
            (key) => {
                if(!key.trim()) return Promise.reject("Password can\'t be empty");
                this.setState({key: key});
                memory.set(CREDENTIALS_KEY, key);
                return this.hidrate_credentials(key);
            },
            () => {
                memory.set(CREDENTIALS_KEY, '');
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
                memory.set(CREDENTIALS_KEY, key);
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
        let raw = window.localStorage.getItem(CREDENTIALS_CACHE);
        if(raw){
            return import(/* webpackChunkName: "cryto" */"../../helpers/crypto")
                .then((crypt) => {
                    try{
                        let credentials = crypt.decrypt(raw, key);
                        this.props.onCredentialsFound(credentials);
                        return Promise.resolve();
                    }catch(e){
                        return Promise.reject({message: "Incorrect password"});
                    }
                })
                .catch((err) => notify.send(err && err.message, "error"))
        }else{
            this.saveCreds(this.props.credentials);
            return Promise.resolve();
        }
    }

    saveCreds(creds){
        const key = memory.get(CREDENTIALS_KEY);
        if(key){
            return import(/* webpackChunkName: "cryto" */"../../helpers/crypto")
                .then((crypt) => window.localStorage.setItem(CREDENTIALS_CACHE, crypt.encrypt(creds, key)))
                .catch((err) => notify.send(err && err.message, "error"));
        }
    }

    render() {
        return null;
    }
}
