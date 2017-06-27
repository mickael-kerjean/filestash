import React from 'react';
import { Session } from '../data';
import { Loader } from '../utilities';

export class HomePage extends React.Component {
    constructor(props){
        super(props);
    }

    componentDidMount(){
        Session.isLogged()
            .then((res) => {
                if(res === true){
                    this.props.history.push('/files');
                }else{
                    this.props.history.push('/login');
                }
            })
            .catch((res) => {
                console.warn(res)
            })
    }
    render() {
        return (
            <div> <Loader /> </div>
        );
    }
}
