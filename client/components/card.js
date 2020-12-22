import React from "react";
import "./card.scss";

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
        const _className = this.props.className ? this.props.className+" box" : "box";
        return (
            <div {...this.props} className={_className}>
              {this.props.children}
            </div>
        );
    }
}
