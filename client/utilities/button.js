import React from 'react'
import PropTypes from 'prop-types';
import { theme } from './theme';

export class Button extends React.Component {
    constructor(props){
        super(props);
    }

    style(){
        let style = {};
        style.border = 'none';
        style.margin = '0';
        style.padding = '5px';
        style.width = '100%';
        style.display = 'inline-block';
        style.outline = 'none';
        style.cursor = 'pointer';
        style.fontSize = 'inherit';
        style.borderRadius = '2px';
        style.color = 'inherit';
        if(this.props.theme === 'primary'){ style.background = theme.colors.primary; style.color = 'white'}
        else if(this.props.theme === 'secondary'){ style.background = theme.colors.secondary; style.color = 'white'}
        else if(this.props.theme === 'emphasis'){ style.background = theme.colors.emphasis; style.color = 'white'}
        else{style.background = 'inherit'}        
        return Object.assign(style, this.props.style);
    }
    
    render() {
        return (
                <button onClick={this.props.onClick} style={this.style()}>{this.props.children}</button>
        );
    }
}

Button.propTypes = {
    theme: PropTypes.string
};
