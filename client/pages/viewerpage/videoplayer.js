import React from 'react';
import { MenuBar } from './menubar';
import videojs from 'video.js';
import 'videojs-contrib-hls';

import 'video.js/dist/video-js.css';
import './videoplayer.scss';

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
            this.player.dispose();
        }
    }

    render(){
        return (
            <div className="component_videoplayer">
              <MenuBar title={this.props.filename} download={this.props.data} />
              <div className="video_container">
                <div>
                  <video ref={ node => this.videoNode = node } className="video-js vjs-default-skin vjs-big-play-centered" style={{boxShadow: 'rgba(0, 0, 0, 0.14) 0px 4px 5px 0px, rgba(0, 0, 0, 0.12) 0px 1px 10px 0px, rgba(0, 0, 0, 0.2) 0px 2px 4px -1px'}}></video>
                </div>
              </div>
            </div>
        );
    }
}
