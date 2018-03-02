import React from 'react';

import { MenuBar } from './menubar';
import { NgIf, Icon } from '../../components/';

export class FileDownloader extends React.Component{
    constructor(props){
        super(props)
        this.state = {loading: false, id: null};
    }

    onClick(){
        this.setState({
            loading: true,
            id: window.setInterval(function(){
                if(document.cookie){
                    this.setState({loading: false})
                    window.clearInterval(this.state.id);
                }
            }.bind(this), 80)
        });
    }

    componentWillUnmount(){
        window.clearInterval(this.state.id)
    }

    render(){
        return (
            <div style={{textAlign: 'center', background: '#525659', height: '100%'}}>
              <div style={{padding: '15px 20px', background: '#323639', borderRadius: '2px', color: 'inherit', boxShadow: 'rgba(0, 0, 0, 0.14) 0px 4px 5px 0px, rgba(0, 0, 0, 0.12) 0px 1px 10px 0px, rgba(0, 0, 0, 0.2) 0px 2px 4px -1px', display: 'inline-block', marginTop: '50px'}}>
                <a download={this.props.filename} href={this.props.data}>
                  <NgIf onClick={this.onClick.bind(this)} cond={!this.state.loading} style={{fontSize: '17px', display: 'inline-block'}}>
                    DOWNLOAD
                  </NgIf>
                </a>
                <NgIf cond={this.state.loading} style={{height: '20px', display: 'inline-block'}}>
                  <Icon name="loading"/>
                </NgIf>
              </div>
            </div>
        );
    }
}
