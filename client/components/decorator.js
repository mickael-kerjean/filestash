import React from 'react';
import { Link } from 'react-router-dom';
import { browserHistory, Redirect } from 'react-router';

import { Session, Admin } from '../model/';
import { Container, Loader, Icon } from '../components/';
import { memory, currentShare } from '../helpers/';

import '../pages/error.scss';

export function LoggedInOnly(WrappedComponent){
    memory.set('user::authenticated', false);

    return class extends React.Component {
        constructor(props){
            super(props);
            this.state = {
                is_logged_in: memory.get('user::authenticated')
            };
        }

        componentDidMount(){
            if(this.state.is_logged_in === false && currentShare() === null){
                Session.currentUser().then((res) => {
                    if(res.is_authenticated === false){
                        this.props.error({message: "Authentication Required"});
                        return;
                    }
                    memory.set('user::authenticated', true);
                    this.setState({is_logged_in: true});
                }).catch((err) => {
                    if(err.code === "NO_INTERNET"){
                        this.setState({is_logged_in: true});
                        return;
                    }
                    this.props.error(err);
                });
            }
        }

        render(){
            if(this.state.is_logged_in === true || currentShare() !== null){
                return <WrappedComponent {...this.props} />;
            }
            return null;
        }
    };
}

export function ErrorPage(WrappedComponent){
    return class extends React.Component {
        constructor(props){
            super(props);
            this.state = {
                error: null
            };
        }

        update(obj){
            this.setState({error: obj});
        }

        navigate(e) {
            e.preventDefault();
            this.props.history.goBack();
        }

        render(){
            if(this.state.error !== null){
                const message = this.state.error.message || "There is nothing in here";
                return (
                    <div>
                      <Link onClick={this.navigate.bind(this)} to={`/${window.location.search}`} className="backnav">
                        <Icon name="arrow_left" />back
                      </Link>
                      <Container>
                        <div className="error-page">
                          <h1>Oops!</h1>
                          <h2>{message}</h2>
                        </div>
                      </Container>
                    </div>
                );
            }
            return (
                <WrappedComponent error={this.update.bind(this)} {...this.props} />
            );
        }
    };
}

export const LoadingPage = (props) => {
    return (
        <div style={{marginTop: parseInt(window.innerHeight / 3)+'px'}}>
          <Loader />
        </div>
    );
};
