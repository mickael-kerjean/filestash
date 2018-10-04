import React from 'react';
import PropTypes from 'prop-types';

import './container.scss';

export class Container extends React.Component {
    constructor(props){
        super(props);
    }
    render() {
        const style = this.props.maxWidth ? {maxWidth: this.props.maxWidth} : {};
        let className = "component_container";
        if(this.props.className) className += " "+this.props.className;
        return (
            <div className={className} style={style}>
              {this.props.children}
            </div>
        );
    }
}
