import React from 'react';
import PropTypes from 'prop-types';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import { Container, NgIf, Icon } from '../../components/';
import './menubar.scss';


export const MenuBar = (props) => {
    return (
        <div className="component_menubar">
          <Container>
            <ReactCSSTransitionGroup transitionName="menubar" transitionLeave={false} transitionEnter={false} transitionAppear={true} transitionAppearTimeout={550}>
              <div className="titlebar" style={{letterSpacing: '0.3px'}}>{props.title}</div>
              <div className="action-item">
                <span className="specific">
                  {props.children}
                </span>
                <DownloadButton link={props.download} name={props.title} />
              </div>
            </ReactCSSTransitionGroup>
          </Container>
        </div>
    );
};

class DownloadButton extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            loading: false,
            id: null
        };
    }

    onDownloadRequest(){
        this.setState({
            loading: true
        });

        // This my friend is a dirty hack aiming to detect when we the download effectively start
        // so that we can display a spinner instead of having a user clicking the download button
        // 10 times. It works by sniffing a cookie in our session that will get destroy when
        // the server actually send a response
        document.cookie = "download=yes; path=/; max-age=120;";
        this.state.id = window.setInterval(() => {
            if(/download=yes/.test(document.cookie) === false){
                window.clearInterval(this.state.id);
                this.setState({loading: false});
            }
        }, 100);
    }

    componentWillUnmount(){
        window.clearInterval(this.state.id);
    }

    render(){
        return (
            <span className="download-button">
              <NgIf cond={!this.state.loading} type="inline">
                <a href={this.props.link} download={this.props.name} onClick={this.onDownloadRequest.bind(this)}>
                  <Icon name="download_white" />
                </a>
              </NgIf>
              <NgIf cond={this.state.loading} type="inline">
                <Icon name="loading_white" />
              </NgIf>
            </span>
        );
    }
}
DownloadButton.PropTypes = {
    link: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
};
