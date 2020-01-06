import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import './connectpage.scss';
import { Session } from '../model/';
import { Container, NgIf, NgShow, Loader, Notification, ErrorPage } from '../components/';
import { ForkMe, PoweredByFilestash, RememberMe, Credentials, Form } from './connectpage/';
import { cache, notify, urlParams } from '../helpers/';

import { Alert } from '../components/';

@ErrorPage
export class ConnectPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            credentials: {},
            remember_me: window.localStorage.hasOwnProperty('credentials') ? true : false,
            loading: true,
            doing_a_third_party_login: false
        };
    }

    componentDidMount(){
        const urlData = urlParams();
        const get_params = Object.keys(urlData);
        if(get_params.length === 0){
            return;
        }else if(get_params.length === 1 && !!urlData["next"]){
            return;
        }

        if(!urlData.type){
            urlData.type = urlData.state;
        }
        this.setState({
            doing_a_third_party_login: true,
            loading: true
        }, () => this.authenticate(urlData));
    }

    authenticate(params){
        Session.authenticate(params)
            .then(Session.currentUser)
            .then((user) => {
                if(location.search.indexOf("?next=") === 0){
                    location = urlParams()["next"];
                }
                let url = '/files/';
                let path = user.home;
                if(path){
                    path = path.replace(/^\/?(.*?)\/?$/, "$1");
                    if(path !== ""){
                        url += path + "/";
                    }
                }
                cache.destroy();
                this.props.history.push(url);
            })
            .catch((err) => {
                this.setState({loading: false});
                notify.send(err, 'error');
            });
    }

    onFormSubmit(data, credentials){
        if('oauth2' in data){
            this.setState({loading: true});
            Session.oauth2(data.oauth2).then((url) => {
                window.location.href = url;
            });
            return;
        }
        this.setState({
            credentials: credentials,
            loading: true
        }, () => this.authenticate(data));
    }

    setRemember(state){
        this.setState({remember_me: state});
    }

    setCredentials(creds){
        this.setState({credentials: creds});
    }

    setLoading(value){
        if(this.state.doing_a_third_party_login !== true){
            this.setState({loading: value});
        }
    }

    onError(err){
        this.props.error(err);
    }

    render() {
        return (
            <div className="component_page_connect">
              <NgIf cond={window.CONFIG["fork_button"]}>
                <ForkMe repo="https://github.com/mickael-kerjean/filestash" />
              </NgIf>
              <Container maxWidth="565px">
                <NgIf cond={this.state.loading === true}>
                  <Loader/>
                </NgIf>
                <NgShow cond={this.state.loading === false}>
                  <ReactCSSTransitionGroup transitionName="form" transitionLeave={false} transitionEnter={false} transitionAppear={true} transitionAppearTimeout={500}>
                    <Form credentials={this.state.credentials}
                          onLoadingChange={this.setLoading.bind(this)}
                          onError={this.onError.bind(this)}
                          onSubmit={this.onFormSubmit.bind(this)} />
                  </ReactCSSTransitionGroup>
                  <ReactCSSTransitionGroup transitionName="remember" transitionLeave={false} transitionEnter={false} transitionAppear={true} transitionAppearTimeout={5000}>
                    <PoweredByFilestash />
                    <RememberMe state={this.state.remember_me} onChange={this.setRemember.bind(this)}/>
                  </ReactCSSTransitionGroup>
                </NgShow>
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
