import React from 'react';

import { MenuBar } from './menubar';
import { NgIf, Icon } from '../../components/';
import './filedownloader.scss';

export class FileDownloader extends React.Component{
    constructor(props){
        super(props)
        this.state = {loading: false, id: null};
    }

    onClick(){
        document.cookie = "download=yes; path=/; max-age=60;";
        this.setState({
            loading: true,
            id: window.setInterval(function(){
                if(/download=yes/.test(document.cookie) === false){
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
            <div className="component_filedownloader">
              <div className="download_button">
                <a download={this.props.filename} href={this.props.data}>
                  <NgIf onClick={this.onClick.bind(this)} cond={!this.state.loading}>
                    DOWNLOAD
                  </NgIf>
                </a>
                <NgIf cond={this.state.loading}>
                  <Icon name="loading"/>
                </NgIf>
              </div>
            </div>
        );
    }
}
