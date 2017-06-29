import React from 'react';
import { MenuBar } from './menubar';
import { theme } from '../../utilities/';
import videojs from 'video.js';

export class VideoPlayer extends React.Component {
    constructor(props){
        super(props);
    }

    componentDidMount(){
        this.player = videojs(this.videoNode, {
            //autoplay: true,
            controls: true,
            aspectRatio: '16:9',
            fluid: false,
            sources: [{
                src: this.props.data
            }]
        }, function onPlayerReady() {
            //console.log('onPlayerReady', this)
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
                  <video ref={ node => this.videoNode = node } className="video-js my-skin" style={{boxShadow: theme.effects.shadow}}></video>
                </div>
              </div>
            </div>
        )
    }
}
