import React from "react";
import PropTypes from "prop-types";

import "./button.scss";

export class Button extends React.Component {
    constructor(props){
        super(props);
    }

    render() {
        let props = Object.assign({}, this.props);
        delete props.theme;
        return (
            <button {...props} className={(this.props.theme || "") + " " + (this.props.className || "")}>
              {this.props.children}
            </button>
        );
    }
}

Button.propTypes = {
    theme: PropTypes.string
};
