import React from 'react';
import { Redirect } from 'react-router-dom';

export class SupportPage extends React.Component {
    constructor(props){
        super(props);
    }

    render(){
        return (
            <div>
              <h2>Support</h2>
              <p>
                <a href="mailto:mickael@kerjean.me">contact us</a> directly if you have/want enterprise support
              </p>
              <p>
                There's also a community chat on Freenode - #filestash (or click  <a href="https://kiwiirc.com/nextclient/#irc://irc.freenode.net/#filestash?nick=guest??">here</a> if you're not an IRC guru).
              </p>
              <h2>Quick Links</h2>
              <ul>
                <li><a href="https://www.filestash.app/support#faq">FAQ</a></li>
                <li><a href="https://www.filestash.app/docs">Documentation</a></li>
                <li><a href="https://www.filestash.app/">Our website</a></li>
              </ul>
            </div>
        );
    }
}
