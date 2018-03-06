import React from 'react';
import PropTypes from 'prop-types';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import { Prompt } from '../../components/';
import { encrypt, decrypt, memory } from '../../helpers/';

export class Credentials extends React.Component {
    constructor(props){
        super(props);
        const key = memory.get('credentials_key') || '';
        this.state = {
            modal_appear: key ? false : this.props.remember_me,
            key: key || '',
            message: '',
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
        if(this.state.key) this.onSubmit(this.state.key);
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

    onCancel(should_clear){
        memory.set('credentials_key', '');
        this.setState({modal_appear: false, key: ''});
    }

    onSubmit(key){
        this.setState({key: key});
        memory.set('credentials_key', key);
        /*
         * 2 differents use cases:
         * - a user is creating a new master password
         * - a user want to unlock existing credentials
         */
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
            <Prompt
              type="password"
              appear={this.state.modal_appear}
              error={this.state.error}
              message={this.state.message}
              onCancel={this.onCancel.bind(this)}
              onSubmit={this.onSubmit.bind(this)}
              />
        );
    }
}

Credentials.propTypes = {
};
