import React from 'react';
import { Redirect } from 'react-router-dom';

export class HomePage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            stage: "loading"
        }
    }

    render(){
        return ( <Redirect to="/admin/dashboard" /> );
    }
}
