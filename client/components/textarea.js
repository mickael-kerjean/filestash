import React from 'react';
import PropTypes from 'prop-types';

import './textarea.scss';

export class Textarea extends React.Component {
    constructor(props){
        super(props);
    }

    render() {
        return (
            <textarea
              {...this.props}
              className='component_textarea'
              ref={(comp) => { this.ref = comp; }}
              ></textarea>
        );
    }
}

Textarea.propTypes = {
    type: PropTypes.string,
    placeholder: PropTypes.string
};
