import React from "react";
import PropTypes from "prop-types";
import { nop } from "../helpers/";
import "./input.scss";

export class Input extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        switch(this.props.type) {
        case "checkbox":
            return (
                <div
                    className="component_checkbox"
                    onMouseDown={this.props.onMouseDown && this.props.onMouseDown.bind(this)}
                    onMouseUp={this.props.onMouseUp && this.props.onMouseUp.bind(this)}>
                    <input
                        type="checkbox"
                        {...this.props}
                        onChange={this.props.onChange || nop}
                        ref={(comp) => this.ref = comp } />
                    <span className="indicator"></span>
                </div>
            );
        default:
            return (
                <input
                    className="component_input"
                    onChange={this.props.onChange || nop}
                    {...this.props}
                    ref={(comp) => this.ref = comp } />
            );
        }
    }
}

Input.propTypes = {
    type: PropTypes.string,
    placeholder: PropTypes.string,
};


export const Select = (props) => {
    const choices = props.choices || [];
    const id = props.id ? { id: props.id } : {};
    return (
        <select className="component_select" onChange={props.onChange} {...id}
            name={props.name} defaultValue={props.value}>
            <option hidden>{ props.placeholder }</option>
            {
                choices.map((choice, index) => {
                    return (
                        <option key={index} name={choice}>{choice}</option>
                    );
                })
            }
        </select>
    );
};

export class Enabler extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        requestAnimationFrame(() => {
            this.toggle(this.props.defaultValue || false);
        });
    }

    onChange(e) {
        this.toggle(e.target.checked);
        this.props.onChange(e);
    }

    toggle(value) {
        const target = this.props.target || [];
        target.map((t) => {
            const $el = document.getElementById(t);
            if (!$el) return;
            if (value === true) {
                $el.parentElement.parentElement.parentElement.parentElement.style.display = "block";
                $el.parentElement.parentElement.parentElement.parentElement.style.opacity = "1";
            } else {
                $el.parentElement.parentElement.parentElement.parentElement.style.display = "none";
                $el.parentElement.parentElement.parentElement.parentElement.style.opacity = "0";

                // reset value
                if ($el.value) {
                    $el.value = null;
                    const event = new Event("input", { bubbles: true });
                    event.simulated = true;
                    $el.dispatchEvent(event);
                }
            }
        });
    }

    render() {
        return (
            <Input type="checkbox" onChange={this.onChange.bind(this)}
                defaultChecked={this.props.defaultValue} />
        );
    }
}
