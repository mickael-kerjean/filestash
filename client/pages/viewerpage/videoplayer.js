import React from 'react';
import { MenuBar } from './menubar';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

export class VideoPlayer extends React.Component {
    constructor(props){
        super(props);
    }

    componentDidMount(){
        this.player = videojs(this.videoNode, {
            controls: true,
            aspectRatio: '16:9',
            fluid: false,
            sources: [{
                src: this.props.data
            }]
        });
    }

    componentWillUnmount() {
        if (this.player) {
            this.player.dispose()
        }
    }

    render(){
        return (
            <div style={{background: '#525659', height: '100%'}}>
              <MenuBar title={this.props.filename} download={this.props.data} />
              <div style={{padding: '20px'}}>
                <div style={{maxWidth: '800px', width: '100%', margin: '0 auto'}}>
                  <video ref={ node => this.videoNode = node } className="video-js my-skin" style={{boxShadow: 'rgba(0, 0, 0, 0.14) 0px 4px 5px 0px, rgba(0, 0, 0, 0.12) 0px 1px 10px 0px, rgba(0, 0, 0, 0.2) 0px 2px 4px -1px'}}></video>
                </div>
              </div>
            </div>
        )
    }
}
