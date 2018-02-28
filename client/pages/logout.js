import React from 'react';
import { Session, invalidate } from '../data';
import { Loader } from '../utilities';

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
