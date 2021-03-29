/*
 * This component was build as an alternative to the select component. The idea is
 * we replace the dirty select on desktop by something more fancy but not on ios/android
 * as there's just no reason for doing that.
 */
import React from "react";
import ReactDOM from "react-dom";

import { Icon, NgIf } from "./";
import "./dropdown.scss";

export class Dropdown extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            button: false
        };
        this.$dropdown = null;
        this.closeDropdown = this.closeDropdown.bind(this);
        this.toggleDropdown = this.toggleDropdown.bind(this);
    }

    componentDidMount(){
        this.$dropdown = ReactDOM.findDOMNode(this).querySelector(".dropdown_button");
        // This is not really the "react" way of doing things but we needed to use both a
        // click on the button and on the body (to exit the dropdown). we had issues
        // that were impossible to solve the "react" way such as the dropdown button click
        // event was triggered after the body click which makes it hard to cancel it ...
        this.$dropdown.addEventListener("click", this.toggleDropdown);
    }

    componentWillUnmount(){
        this.$dropdown.removeEventListener("click", this.toggleDropdown);
        document.body.removeEventListener("click", this.closeDropdown);
    }

    onSelect(name){
        this.props.onChange(name);
    }

    closeDropdown(){
        document.body.removeEventListener("click", this.closeDropdown);
        this.setState({button: false});
    }

    toggleDropdown(){
        if(this.props.enable === false){
            return;
        }
        document.body.removeEventListener("click", this.closeDropdown);
        this.setState({button: !this.state.button}, () => {
            if(this.state.button === true){
                requestAnimationFrame(() => {
                    document.body.addEventListener("click", this.closeDropdown);
                });
            }
        });
    }

    render(){
        const button = this.props.children[0];

        const dropdown = React.cloneElement(this.props.children[1], {onSelect: this.onSelect.bind(this)});
        let className = "component_dropdown ";
        className += this.props.className ? this.props.className+" " : "";
        className += this.state.button ? " active" : "";
        return (
            <div className={className}>
              { button }
              { dropdown }
            </div>
        );
    }
}


export const DropdownButton = (props) => {
    return (
        <div className="dropdown_button">
          { props.children }
        </div>
    );
};


export const DropdownList = (props) => {
    const childrens = Array.isArray(props.children) ? props.children : [props.children];
    return (
        <div className="dropdown_container">
          <ul>
            {
                childrens.map((children, index) => {
                    const child = React.cloneElement(children, {onSelect: props.onSelect });
                    return (
                        <li key={index}>{child}</li>
                    );
                })
            }
          </ul>
        </div>
    );
};

export const DropdownItem = (props) => {
    return (
        <div onClick={props.onSelect.bind(null, props.name)}>
          {props.children}
          <NgIf cond={!!props.icon} type="inline">
            <span style={{float: "right"}}>
              <Icon name={props.icon} />
            </span>
          </NgIf>
        </div>
    );
};
