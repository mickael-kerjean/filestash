import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import config from '../../config.js';
import { Container, NgIf, Loader, Notification, theme } from '../utilities/';
import { Session, invalidate } from '../data';
import { ForkMe, RememberMe, Credentials, Form } from './connectpage/';

import './connectpage.scss';


export class ConnectPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            credentials: {},
            remember_me: window.localStorage.hasOwnProperty('credentials') ? true : false,
            loading: false,
            error: null,
            marginTop: this._marginTop()
        };

        // adapted from: https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
        function getParam(name) {
            const regex = new RegExp("[?&#]" + name.replace(/[\[\]]/g, "\\$&") + "(=([^&#]*)|&|#|$)");
            const results = regex.exec(window.location.href);
            if (!results) return null;
            if (!results[2]) return '';
            return decodeURIComponent(results[2].replace(/\+/g, " "));
        }

        // dropbox login
        if(getParam('state') === 'dropbox'){
            this.state.loading = true;
            this.authenticate({bearer: getParam('access_token'), type: 'dropbox'});
        }
        // google drive login
        if(getParam('code')){
            this.state.loading = true;
            this.authenticate({code: getParam('code'), type: 'gdrive'});
        }
    }

    componentWillMount(){
        window.onresize = () => {
            this.setState({marginTop: this._marginTop()});
        };
    }
    _marginTop(){
        let size = Math.round(Math.abs((document.body.offsetHeight - 300) / 2));
        return size > 150? 150 : size;
    }

    authenticate(params){
        if(params.type === 'dropbox') return this.login_dropbox();
        else if(params.type === 'gdrive') return this.login_google();

        this.setState({loading: true});
        Session.authenticate(params)
            .then((ok) => {
                this.setState({loading: false});
                invalidate();
                const path = params.path && /^\//.test(params.path)? /\/$/.test(params.path) ? params.path : params.path+'/' :  '/';
                this.props.history.push('/files'+path);
            })
            .catch(err => {
                if(err && err.code === 'CANCELLED'){ return; }
                this.setState({loading: false, error: err});
                window.setTimeout(() => {
                    this.setState({error: null});
                }, 1000);
            });
    }

    login_dropbox(e){
        this.setState({loading: true});
        Session.url('dropbox').then((url) => {
            window.location.href = url;
        }).catch((err) => {
            if(err && err.code === 'CANCELLED'){ return; }
            this.setState({loading: false, error: err});
            window.setTimeout(() => {
                this.setState({error: null});
            }, 1000);
        });
    }

    login_google(e){
        this.setState({loading: true});
        Session.url('gdrive').then((url) => {
            window.location.href = url;
        }).catch((err) => {
            if(err && err.code === 'CANCELLED'){ return }
            this.setState({loading: false, error: err});
            window.setTimeout(() => {
                this.setState({error: null});
            }, 1000);
        });
    }

    onFormSubmit(data, credentials){
        this.setState({credentials: credentials});
        this.authenticate(data);
    }

    setRemember(state){
        this.setState({remember_me: state});
    }

    setCredentials(creds){
        this.setState({credentials: creds});
    }

    render() {
        return (
            <div className="component_page_connect">
              <NgIf cond={config.fork_button}>
                <ForkMe repo="https://github.com/mickael-kerjean/nuage" />
              </NgIf>
              <Container maxWidth="565px">
                <NgIf cond={this.state.loading === true}>
                  <Loader/>
                </NgIf>

                <ReactCSSTransitionGroup
                  transitionName="form"
                  transitionLeave={false}
                  transitionEnter={false}
                  transitionAppear={true} transitionAppearTimeout={500}
                  >
                  <NgIf key={"form"+this.state.loading} cond={this.state.loading === false}>
                    <Form
                      credentials={this.state.credentials}
                      onSubmit={this.onFormSubmit.bind(this)} />
                    <RememberMe state={this.state.remember_me} onChange={this.setRemember.bind(this)}/>
                  </NgIf>
                </ReactCSSTransitionGroup>
                <Credentials remember_me={this.state.remember_me}
                          onRememberMeChange={this.setRemember.bind(this)}
                          onCredentialsFound={this.setCredentials.bind(this)}
                          credentials={this.state.credentials} />
                <Notification error={this.state.error && this.state.error.message} />
              </Container>
            </div>
        );
    }
}
