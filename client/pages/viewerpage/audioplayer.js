import React from 'react';
import WaveSurfer from  'wavesurfer.js';

import { MenuBar } from './menubar';
import { NgIf, Icon } from '../../components/';
import './audioplayer.scss';

export class AudioPlayer extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            wafesurfer: null,
            loading: true,
            isPlaying: true,
            error: null
        }
        this.toggle = this.toggle.bind(this);
        window.addEventListener('keypress', this.toggle);
    }

    componentDidMount(){
        let $el = document.querySelector('.player');
        var wavesurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: '#323639',
            progressColor: '#6f6f6f',
            cursorColor: '#323639',
            cursorWidth: 2,
            height: 250,
            barWidth: 1
        });
        this.setState({wavesurfer: wavesurfer});
        wavesurfer.on('ready', () => {
            this.setState({loading: false});
            if(this.state.isPlaying === true){
                wavesurfer.play();
            }
        });
        wavesurfer.on('error', (err) => {
            this.setState({error: err, loading: false});
        });
        wavesurfer.load(this.props.data);
    }

    componentWillUnmount(){
        if(this.state.wavesurfer){
            this.state.wavesurfer.destroy();
        }
        window.removeEventListener('keypress', this.toggle);
    }

    toggle(){
        if(this.state.isPlaying === true){
            this.setState({isPlaying: false});
            this.state.wavesurfer.pause();
        }else{
            this.setState({isPlaying: true});
            this.state.wavesurfer.play();
        }
    }

    onPlay(e){
        e.preventDefault();
        e.stopPropagation();
        this.setState({isPlaying: true})
        this.state.wavesurfer.play();
    }

    onPause(e){
        e.preventDefault();
        e.stopPropagation();
        this.setState({isPlaying: false});
        this.state.wavesurfer.pause();
    }

    render(){
        return (
            <div className="component_audioplayer">
              <MenuBar title={this.props.filename} download={this.props.data} />
              <div className="audioplayer_container">
                <NgIf cond={this.state.error !== null} className="audioplayer_error">
                  {this.state.error}
                </NgIf>
                <NgIf cond={this.state.error === null}>
                  <NgIf cond={this.state.loading === true}>
                    <Icon name="loading" />
                  </NgIf>
                  <div className="audioplayer_box" style={{opacity: this.state.loading? '0' : '1'}}>
                    <div className="audioplayer_control">
                      <NgIf cond={this.state.isPlaying === false}>
                        <span onClick={this.onPlay.bind(this)}><Icon name="play"/></span>
                      </NgIf>
                      <NgIf cond={this.state.isPlaying === true}>
                        <span onClick={this.onPause.bind(this)}><Icon name="pause"/></span>
                      </NgIf>
                    </div>
                    <div id="waveform"></div>
                  </div>
                </NgIf>
              </div>
            </div>
        )
    }
}
