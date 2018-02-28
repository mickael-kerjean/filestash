import React from 'react';
import PropTypes from 'prop-types';
import './input.scss';

export class Input extends React.Component {
    constructor(props){
        super(props);
    }

    render() {
        return (
            <input
              className="component_input"
              {...this.props}
              ref={(comp) => { this.ref = comp; }}
              />
        );
    }
}

Input.propTypes = {
    type: PropTypes.string,
    placeholder: PropTypes.string
};
