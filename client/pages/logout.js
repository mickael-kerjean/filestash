import React from 'react';

import { Session } from '../model/';
import { Loader } from '../components/';
import { cache } from '../helpers/';

export class LogoutPage extends React.Component {
    constructor(props){
        super(props);
    }

    componentDidMount(){
        Session.logout()
            .then((res) => {
                cache.destroy();
                this.props.history.push('/');
            })
            .catch((res) => {
                console.warn(res)
            });
    }
    render() {
        return (
            <div> <Loader /> </div>
        );
    }
}
