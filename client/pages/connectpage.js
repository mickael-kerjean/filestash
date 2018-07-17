import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import './connectpage.scss';
import { Session } from '../model/';
import { Container, NgIf, Loader, Notification } from '../components/';
import { ForkMe, RememberMe, Credentials, Form } from './connectpage/';
import { cache, notify } from '../helpers/';
import config from '../../config_client';

import { Alert } from '../components/';

export class ConnectPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            credentials: {},
            remember_me: window.localStorage.hasOwnProperty('credentials') ? true : false,
            loading: false,
            doing_a_third_party_login: false
        };
    }

    componentWillMount(){
        // adapted from: https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
        function getParam(name) {
            const regex = new RegExp("[?&#]" + name.replace(/[\[\]]/g, "\\$&") + "(=([^&#]*)|&|#|$)");
            const results = regex.exec(window.location.href);
            if (!results) return null;
            if (!results[2]) return '';
            return decodeURIComponent(results[2].replace(/\+/g, " "));
        }

        const state = getParam('state');
        if(state === "dropbox"){
            this.setState({doing_a_third_party_login: true});
            this.authenticate({bearer: getParam('access_token'), type: 'dropbox'});
        }else if(state === "googledrive"){
            this.setState({doing_a_third_party_login: true});
            this.authenticate({code: getParam('code'), type: 'gdrive'});
        }
    }

    authenticate(params){
        this.setState({loading: true});
        Session.authenticate(params)
            .then((ok) => {
                cache.destroy();
                this.props.history.push('/files/');
            })
            .catch((err) => {
                this.setState({loading: false});
                notify.send(err, 'error');
            });
    }

    initiateAuthToThirdParty(source){
        if(source === 'dropbox'){
            this.setState({loading: true});
            Session.url('dropbox').then((url) => {
                window.location.href = url;
            }).catch((err) => {
                this.setState({loading: false});
                notify.send(err, 'error');
            });
        }else if(source === 'google'){
            this.setState({loading: true});
            Session.url('gdrive').then((url) => {
                window.location.href = url;
            }).catch((err) => {
                this.setState({loading: false});
                notify.send(err, 'error');
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
              <NgIf cond={CONFIG["fork_button"]}>
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
              </Container>
            </div>
        );
    }
}
