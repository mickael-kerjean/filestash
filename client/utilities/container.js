import React from 'react'
import PropTypes from 'prop-types';

export class Container extends React.Component {
    constructor(props){
        super(props);
    }
    render() {
        const style = Object.assign({width: '95%', maxWidth: this.props.maxWidth || '800px', margin: '0 auto', padding: '10px'}, this.props.style || {});
        return (
            <div style={style}>
              {this.props.children}
            </div>
        );
    }
}
