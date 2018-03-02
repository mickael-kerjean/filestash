import React from 'react';

import { Container, NgIf, Icon } from '../../components/';

export class MenuBar extends React.Component{
    constructor(props){
        super(props);
        this.state = {loading: false, id: null}
    }

    onDownloadRequest(){
        this.setState({
            loading: true,
            id: window.setInterval(function(){
                if(document.cookie){
                    this.setState({loading: false})
                    window.clearInterval(this.state.id);
                }
            }.bind(this), 80)
        })
    }

    componentWillUnmount(){
        window.clearInterval(this.state.id)
    }


    render(){
        return (
            <div style={{background: '#313538', color: '#f1f1f1', boxShadow: 'rgba(0, 0, 0, 0.14) 2px 2px 2px 0px'}}>
              <Container style={{padding: '9px 0', textAlign: 'center', color: '#f1f1f1', fontSize: '0.9em'}}>
                <NgIf cond={this.props.hasOwnProperty('download')} style={{float: 'right', height: '1em'}}>
                  <NgIf cond={!this.state.loading} style={{display: 'inline'}}>
                    <a href={this.props.download} download={this.props.title} onClick={this.onDownloadRequest.bind(this)}>
                      <Icon name="download" style={{width: '15px', height: '15px'}} />
                    </a>
                  </NgIf>
                  <NgIf cond={this.state.loading} style={{display: 'inline'}}>
                    <Icon name="loading" style={{width: '15px', height: '15px'}} />
                  </NgIf>
                </NgIf>
                <span style={{letterSpacing: '0.3px'}}>{this.props.title}</span>
              </Container>
            </div>
        );
    }
}
