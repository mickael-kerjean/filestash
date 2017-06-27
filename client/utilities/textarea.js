import React from 'react'
import PropTypes from 'prop-types';
import { theme } from './theme';

export class Textarea extends React.Component {
    constructor(props){
        super(props);
    }

    style(){
        let style = this.props.style || {};
        style.background = 'inherit';
        style.border = 'none';
        style.borderRadius = '0';
        style.borderBottom = '2px solid rgba(70, 99, 114, 0.1)'
        style.width = '100%';
        style.display = 'inline-block';
        style.fontSize = 'inherit';
        style.padding = '5px 0px 5px 0px';
        style.margin = '0 0 8px 0';
        style.outline = 'none';
        style.boxSizing = 'border-box';
        style.color = 'inherit';
        return style;
    }
    
    render() {
        return (
            <textarea
              style={this.style()}
              name={this.props.name}
              type={this.props.type}
              value={this.props.value}
              defaultValue={this.props.defaultValue}
              placeholder={this.props.placeholder || ''}
              ></textarea>
        );
    }
}

Textarea.propTypes = {
    type: PropTypes.string,
    placeholder: PropTypes.string
};
