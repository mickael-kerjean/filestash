import React from 'react';

import { Session } from '../model/';
import { Loader } from '../components/';
import { invalidate } from '../helpers/';

export class LogoutPage extends React.Component {
    constructor(props){
        super(props);
    }

    componentDidMount(){
        invalidate();
        Session.logout()
            .then((res) => {
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
