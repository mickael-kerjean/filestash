import React from 'react';
import { Redirect } from 'react-router';

import { Input, Button, Container, Icon, Loader } from '../../components/';
import { Config, Admin } from '../../model/';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

export class LoginPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            loading: false,
            error: null
        };
    }

    componentDidMount(){
        this.refs.$input.ref.focus();
    }

    authenticate(e){
        e.preventDefault();
        this.setState({loading: true});
        Admin.login(this.refs.$input.ref.value)
            .then(() => this.props.reload())
            .catch(() => {
                this.refs.$input.ref.value = "";
                this.setState({
                    loading: false,
                    error: true
                }, () => {
                    window.setTimeout(() => {
                        this.setState({error: false});
                    }, 500);
                });
            });
    }

    render(){
        const marginTop = () => { return {marginTop: parseInt(window.innerHeight / 3)+'px'};};

        return (
            <Container maxWidth="300px" className="sharepage_component">
              <form className={this.state.error ? "error" : ""} onSubmit={this.authenticate.bind(this)} style={marginTop()}>
                <Input ref="$input" type="text" placeholder="Password" />
                <Button theme="transparent">
                  <Icon name={this.state.loading ? "loading" : "arrow_right"}/>
                </Button>
              </form>
            </Container>
        );
    }
}
