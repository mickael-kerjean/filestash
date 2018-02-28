import React from 'react';
import {theme} from './theme';

import './card.scss';

export class Card extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            dragging: false
        };
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
        return (
            <div {...this.props} className={this.props.className+" box"}>
              {this.props.children}
            </div>
        );
    }
}
