import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import './connectpage.scss';
import { Session } from '../model/';
import { Container, NgIf, Loader, Notification } from '../components/';
import { ForkMe, RememberMe, Credentials, Form } from './connectpage/';
import { invalidate } from '../helpers/';
import config from '../../config.js';


export class ConnectPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            credentials: {},
            remember_me: window.localStorage.hasOwnProperty('credentials') ? true : false,
            loading: false,
            error: null,
            doing_a_third_party_login: false
        };
    }

    componentDidMount(){
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
            this.authenticate({bearer: getParam('access_token'), type: 'dropbox'});
            this.setState({doing_a_third_party_login: true});
        }
        // google drive login
        if(getParam('code')){
            this.authenticate({code: getParam('code'), type: 'gdrive'});
            this.setState({doing_a_third_party_login: true});
        }
    }

    authenticate(params){
        this.setState({loading: true});
        Session.authenticate(params)
            .then((ok) => {
                invalidate();
                const path = params.path && /^\//.test(params.path)? /\/$/.test(params.path) ? params.path : params.path+'/' :  '/';
                this.props.history.push('/files'+path);
            })
            .catch(err => {
                this.setState({loading: false, error: err});
                window.setTimeout(() => this.setState({error: null}), 1000);
            });
    }

    initiateAuthToThirdParty(source){
        if(source === 'dropbox'){
            this.setState({loading: true});
            Session.url('dropbox').then((url) => {
                window.location.href = url;
            }).catch((err) => {
                this.setState({loading: false, error: err});
                window.setTimeout(() => this.setState({error: null}), 1000);
            });
        }else if(source === 'google'){
            this.setState({loading: true});
            Session.url('gdrive').then((url) => {
                window.location.href = url;
            }).catch((err) => {
                this.setState({loading: false, error: err});
                window.setTimeout(() => this.setState({error: null}), 1000);
            });
        }
    }

    onFormSubmit(data, credentials){
        this.setState({credentials: credentials}, () => {
            this.authenticate(data);
        });
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

                <NgIf cond={this.state.loading === false}>
                  <ReactCSSTransitionGroup transitionName="form" transitionLeave={false} transitionEnter={false} transitionAppear={true} transitionAppearTimeout={500}>
                    <Form credentials={this.state.credentials}
                          onThirdPartyLogin={this.initiateAuthToThirdParty.bind(this)}
                          onSubmit={this.onFormSubmit.bind(this)} />
                  </ReactCSSTransitionGroup>
                  <ReactCSSTransitionGroup transitionName="remember" transitionLeave={false} transitionEnter={false} transitionAppear={true} transitionAppearTimeout={5000}>
                    <RememberMe state={this.state.remember_me} onChange={this.setRemember.bind(this)}/>
                  </ReactCSSTransitionGroup>
                </NgIf>
                <NgIf cond={this.state.doing_a_third_party_login === false}>
                  <Credentials remember_me={this.state.remember_me}
                               onRememberMeChange={this.setRemember.bind(this)}
                               onCredentialsFound={this.setCredentials.bind(this)}
                               credentials={this.state.credentials} />
                </NgIf>
                <Notification error={this.state.error && this.state.error.message} />
              </Container>
            </div>
        );
    }
}
