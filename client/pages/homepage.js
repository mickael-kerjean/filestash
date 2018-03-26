import React from 'react';

import { Session } from '../model/';
import { Loader } from '../components/';

export class HomePage extends React.Component {
    constructor(props){
        super(props);
    }

    componentDidMount(){
        Session.isLogged()
            .then((res) => {
                if(res && res.result === true){
                    this.props.history.push('/files');
                }else{
                    this.props.history.push('/login');
                }
            });
    }
    render() {
        return (
            <div> <Loader /> </div>
        );
    }
}
