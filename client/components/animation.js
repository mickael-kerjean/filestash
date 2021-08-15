import React, { useState, useEffect } from "react";

/**
 * Back when I started this project, there used to be a library for animation made by facebook
 * named: react-addons-css-transition-group
 * Facebook got away from it and things haven't stayed backward compatible at the point where I got
 * to realise it would be easier to write this simpler wrapper than migrate things over
 */
export function CSSTransition({ transitionName = "animate", children = null, transitionAppearTimeout = 300 }) {
    const [child, setChildren] = useState(React.cloneElement(children, {
        className: `${children.props.className} ${transitionName}-appear`
    }));

    useEffect(() => {
        setChildren(React.cloneElement(child, {
            className: `${children.props.className} ${transitionName}-appear ${transitionName}-appear-active`
        }))
        const timeout = setTimeout(() => {
            setChildren(React.cloneElement(child, {
                className: `${children.props.className}`
            }))
        }, transitionAppearTimeout);

        return () => {
            clearTimeout(timeout);
        };
    }, []);

    return child;
}
