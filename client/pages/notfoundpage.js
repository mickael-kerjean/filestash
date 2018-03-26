import React from 'react';
import { Link } from 'react-router-dom';

import { Button } from '../components/';
import './notfoundpage.scss';

export class NotFoundPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            timeout: 10
        };
    }

    componentDidMount(){
        this.countdown();
    }

    countdown(){
        if(this.state.timeout > 0){
            this.setState({timeout: this.state.timeout - 1});
            window.setTimeout(() => {
                this.countdown();
            }, 1000);
        }else{
            this.props.history.push("/");
        }
    }

    render() {
        return (
            <div className="component_page_notfound">
              <h1>Oops!</h1>
              <h2>We can't seem to find the page you're looking for.</h2>
              <p>
                You will be redirected to the <Link to="/">homepage</Link> in {this.state.timeout} seconds
              </p>
            </div>
        );
    }
}
