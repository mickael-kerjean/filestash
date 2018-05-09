import React from 'react';
import { Redirect } from 'react-router';

import { Session } from '../model/';
import { Loader } from '../components/';

export class HomePage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            redirection: null
        };
    }

    componentDidMount(){
        Session.isLoggedIn()
            .then((res) => {
                if(res === true){
                    this.setState({redirection: "/files"});
                }else{
                    this.setState({redirection: "/login"});
                }
            })
            .catch((err) => {
                this.setState({redirection: "/login"});
            });
    }
    render() {
        if(this.state.redirection !== null){
            return ( <Redirect to={this.state.redirection} /> );
        }
        return ( <div> <Loader /> </div> );
    }
}
