import React from 'react';

import { Session } from '../model/';
import { Loader, ErrorPage } from '../components/';
import { cache } from '../helpers/';

@ErrorPage
export class LogoutPage extends React.Component {
    constructor(props){
        super(props);
    }

    componentDidMount(){
        Session.logout()
            .then((res) => {
                cache.destroy();
                this.props.history.push('/login');
            })
            .catch((err) => this.props.error(err));
    }
    render() {
        return (
            <div> <Loader /> </div>
        );
    }
}
