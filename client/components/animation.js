import React, { useState, useEffect } from "react";

/**
 * Back when I started this project, there used to be a library for animation made by facebook
 * named: react-addons-css-transition-group
 * Facebook got away from it and things haven't stayed backward compatible at the point where I got
 * to realise it would be easier to write this simpler wrapper than migrate things over
 */
export function CSSTransition({ transitionName = "animate", children = null, transitionAppearTimeout = 300 }) {
    const [className, setClassName] = useState(`${transitionName} ${transitionName}-appear`);

    useEffect(() => {
        setClassName(`${transitionName} ${transitionName}-appear ${transitionName}-appear-active`)

        const timeout = setTimeout(() => {
            setClassName(`${transitionName}`)
        }, transitionAppearTimeout);
        return () => clearTimeout(timeout);
    }, []);

    return (
        <div className={className}>
            { children }
        </div>
    )
}
