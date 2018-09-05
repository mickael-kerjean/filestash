import React from 'react';
import { Redirect } from 'react-router';

import { Share } from '../model/';
import { notify } from '../helpers/';
import { Loader, Input, Button, Container } from '../components/';
import './error.scss';

export class SharePage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            redirection: null,
            loading: true,
            request_password: false,
            request_username: false
        };
    }

    componentDidMount(){
        Share.get(this.props.match.params.id)
            .then((res) => {
                this.setState({
                    loading: false,
                    redirection: res
                });
            })
            .catch((res) => {
                console.log(">> COMPONENT DID MOUNT:: ", res);
                this.setState({
                    loading: false
                });
            });
    }
    render() {
        if(this.state.loading === true){
            return ( <div> <Loader /> </div> );
        }

        if(this.state.request_password === true){
            return (
                <Container maxWidth="350px">
                  <form style={{marginTop: parseInt(window.innerHeight / 3)+'px'}}>
                    <Input type="password" placeholder="Password" />
                    <Button theme="emphasis">OK</Button>
                  </form>
                </Container>
            );
        }else if(this.state.request_username === true){
            return (
                <Container maxWidth="350px">
                  <form style={{marginTop: parseInt(window.innerHeight / 3)+'px'}}>
                    <Input type="text" placeholder="Your email address" />
                    <Button theme="emphasis">OK</Button>
                  </form>
                </Container>
            );
        }

        if(this.state.redirection !== null){
            if(this.state.redirection.slice(-1) === "/"){
                return ( <Redirect to={"/files" + this.state.redirection} /> );
            }else{
                return ( <Redirect to={"/view" + this.state.redirection} /> );
            }
        }else{
            return (
                <div className="error-page">
                  <h1>Oops!</h1>
                  <h2>There's nothing in here</h2>
                </div>
            );
        }
    }
}
