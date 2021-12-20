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

    const disabledEnter = (e) => {
        if (e.key === "Enter" && e.shiftKey === false) {
            e.preventDefault();
            const $form = getForm($el.current);
            if ($form) {
                $form.dispatchEvent(new Event("submit", { cancelable: true }));
            }
        }

        function getForm($el) {
            console.log("GET FORM $el", $el);
            if (!$el.parentElement) return $el;
            if ($el.parentElement.nodeName == "FORM") {
                return $el.parentElement;
            }
            return getForm($el.parentElement);
        }
    };
    const inputProps = (p) => {
        return Object.keys(p).reduce((acc, key) => {
            if (key === "disabledEnter") return acc;
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
    );
}
