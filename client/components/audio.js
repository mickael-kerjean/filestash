import React from 'react';
import PropTypes from 'prop-types';

import { Container, Icon, NgIf } from './';
import './audio.scss';

export class Audio extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            percent: 0,
            state: 'play'
        };
    }

    componentDidMount(){
        requestAnimationFrame(() => {
            if(this.state.state === 'play'){
                if(this.state.percent < 100){
                    this.setState({percent: this.state.percent + 0.1}, this.componentDidMount);
                }else{
                    this.setState({percent: 0}, this.componentDidMount);
                }
            }
        });
    }

    onStateChange(new_state){
        this.setState({state: new_state});
    }

    render(){
        return (
            <div className="component_audio">
              <Container maxWidth={700}>
                <div style={{display: 'flex'}}>
                  <Control state={this.state.state} onPlay={this.onStateChange.bind(this, 'play')} onPause={this.onStateChange.bind(this, 'pause')}/>
                  <Progress purcent={this.state.percent} />
                  <Volume />
                  <TrackInfo name="Cloudkicker - Let Yourself Be Huge - Explore, be curious" />
                </div>
              </Container>
            </div>
        );
    }
}

const Volume = (props) => {
    return (
        <div className="component_volume">
          VOLUME
          <div className="volume-controller-wrapper">
            <div className="volume-controller">s</div>
          </div>
        </div>
    );
}

const Control = (props) => {
    return (
        <div className="component_control">
          <NgIf cond={props.state === 'pause'} type="inline">
            <Icon name="play" onClick={props.onPlay}/>
          </NgIf>
          <NgIf cond={props.state === 'play'} type="inline">
            <Icon name="pause" onClick={props.onPause}/>
          </NgIf>
        </div>
    );
}


const Progress = (props) => {
    return (
        <div className="component_progress">
          <div className="placeholder"></div>
          <div className="progress-bar" style={{width: props.purcent+"%"}}></div>
        </div>
    );
}

const TrackInfo = (props) => {
    return (
        <div className="component_trackinfo">
          <div>
            {props.name}
          </div>
        </div>
    );
}
