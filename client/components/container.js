import React from 'react';
import PropTypes from 'prop-types';

import './container.scss';

export class Container extends React.Component {
    constructor(props){
        super(props);
    }
    render() {
        const style = this.props.maxWidth ? {maxWidth: this.props.maxWidth} : {};
        return (
            <div className="component_container" style={style}>
              {this.props.children}
            </div>
        );
    }
}
