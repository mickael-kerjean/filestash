import React from 'react'
import PropTypes from 'prop-types';

export class NgIf extends React.Component {
    constructor(props){
        super(props);
    }
    
    render() {
        if(this.props.cond){
            return <div onClick={this.props.onClick} style={this.props.style}>{this.props.children}</div>;
        }else{
            return null;
        }
    }
}

NgIf.propTypes = {
     cond: PropTypes.bool
};
