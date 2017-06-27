import React from 'react';
import {theme} from './theme';

export class Card extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            dragging: false
        }
    }

    onClick(){
        if(this.props.onClick){
            this.props.onClick();
        }
    }

    onMouseEnter(){
        if(this.props.onMouseEnter){
            this.props.onMouseEnter();
        }
    }

    onMouseLeave(){
        if(this.props.onMouseLeave){
            this.props.onMouseLeave();
        }
    }

    render() {
        let style = {};
        style.padding = '10px';
        style.color = '#474747';
        style.cursor = 'pointer';
        style.margin = '2px 0';
        style.background = 'white'; style.boxShadow = theme.effects.shadow_large;
        style.overflow = 'hidden';
        style.position = 'relative';
        for(let key in this.props.style){
            style[key] = this.props.style[key];
        }

        return (
            <div onClick={this.onClick.bind(this)} onMouseEnter={this.onMouseEnter.bind(this)} onMouseLeave={this.onMouseLeave.bind(this)} style={style}>
              {this.props.children}
            </div>
        );
    }
}
