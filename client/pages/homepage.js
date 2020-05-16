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
        Session.currentUser()
            .then((res) => {
                if(res && res.is_authenticated === true){
                    let url = "/files"
                    if(res.home){
                        url += res.home
                    }
                    this.setState({redirection: url});
                }else{
                    this.setState({redirection: "/login"});
                }
            })
            .catch((err) => this.setState({redirection: "/login"}));
    }
    render() {
        if(this.state.redirection !== null){
            return ( <Redirect to={`${window.URL_PREFIX}/${this.state.redirection}`} /> );
        }
        return ( <div> <Loader /> </div> );
    }
}
