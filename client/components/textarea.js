import React, { useRef, useState, useLayoutEffect } from "react";

import "./textarea.scss";

export function Textarea({ ...props }) {
    const $el = useRef();
    const [className, setClassName] = useState(
        "component_textarea" +
            (/Firefox/.test(navigator.userAgent) ? " firefox" : "") +
            (props.value && props.value.length > 0 ? " hasText" : ""),
    );

    useLayoutEffect(() => {
        if ($el.current && $el.current.value.length > 0 &&
            className.indexOf("hasText") === -1) {
            setClassName(`${className} hasText`);
        }
    }, []);

    const inputProps = (p) => {
        return Object.keys(p).reduce((acc, key) => {
            if (key === "disabledEnter") return acc;
            acc[key] = p[key];
            return acc;
        }, {});
    };

    return (
        <textarea
            {...inputProps(props)}
            className={className}
            ref={$el}>
        </textarea>
    );
}
