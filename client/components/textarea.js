import React, { useRef, useState, useLayoutEffect } from "react";
import PropTypes from "prop-types";

import "./textarea.scss";

export function Textarea({ ...props }) {
    const $el = useRef();
    const [className, setClassName] = useState(
        "component_textarea"
            + (/Firefox/.test(navigator.userAgent) ? " firefox" : "")
            + (props.value && props.value.length > 0 ? " hasText" : "")
    );

    useLayoutEffect(() => {
        if($el.current && $el.current.value.length > 0 && className.indexOf("hasText") === -1){
            setClassName(`${className} hasText`)
        }
    }, []);

    const disabledEnter = (e) => {
        if(e.key === "Enter" && e.shiftKey === false){
            e.preventDefault();
            const $form = getForm($el.current.ref);
            if($form){
                $form.dispatchEvent(new Event("submit", { cancelable: true }));
            }
        }

        function getForm($el){
            if(!$el.parentElement) return $el;
            if($el.parentElement.nodeName == "FORM"){
                return $el.parentElement;
            }
            return getForm($el.parentElement);
        }
    };
    const inputProps = (p) => {
        return Object.keys(p).reduce((acc, key) => {
            if(key === "disabledEnter") return acc;
            acc[key] = p[key];
            return acc;
        }, {});
    };

    return (
        <textarea
            onKeyPress={disabledEnter}
            {...inputProps(props)}
            className={className}
            ref={$el}>
        </textarea>
    )
}
export class Textarea2 extends React.Component {
    constructor(props){
        super(props);
    }

    render() {
        let className = "component_textarea";
        if(/Firefox/.test(navigator.userAgent)){
            className += " firefox";
        }
        if((this.refs.el !== undefined && this.refs.el.value.length > 0) || (this.props.value !== undefined && this.props.value.length > 0)){
            className += " hasText";
        }

        const disabledEnter = (e) => {
            if(e.key === "Enter" && e.shiftKey === false){
                e.preventDefault();
                const $form = getForm(this.refs.el);
                if($form){
                    $form.dispatchEvent(new Event("submit", { cancelable: true }));
                }
            }

            function getForm($el){
                if(!$el.parentElement) return $el;
                if($el.parentElement.nodeName == "FORM"){
                    return $el.parentElement;
                }
                return getForm($el.parentElement);
            }
        };
        const inputProps = (p) => {
            return Object.keys(p).reduce((acc, key) => {
                if(key === "disabledEnter") return acc;
                acc[key] = p[key];
                return acc;
            }, {});
        };
        return (
            <textarea
              onKeyPress={disabledEnter}
              {...inputProps(this.props)}
              className={className}
              ref="el"
              ></textarea>
        );
    }
}

Textarea.propTypes = {
    type: PropTypes.string,
    placeholder: PropTypes.string,
    disabledEnter: PropTypes.bool
};
