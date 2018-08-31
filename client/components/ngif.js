import React from 'react'
import PropTypes from 'prop-types';

export class NgIf extends React.Component {
    constructor(props){
        super(props);
    }

    render() {
        let clean_prop = Object.assign({}, this.props);
        delete clean_prop.cond;
        delete clean_prop.children;
        delete clean_prop.type;
        if(this.props.cond){
            if(this.props.type === "inline"){
                return <span {...clean_prop}>{this.props.children}</span>;
            }else{
                return <div {...clean_prop}>{this.props.children}</div>;
            }
        }else{
            return null;
        }
    }
}

NgIf.propTypes = {
    cond: PropTypes.bool.isRequired,
    type: PropTypes.string
};
