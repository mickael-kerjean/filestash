import React, { useEffect, useState } from "react";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";
import PropTypes from "prop-types";

import { NgIf } from "./";
import { debounce } from "../helpers/";
import "./modal.scss";

export function Modal({
    isActive = false, children = null, className = null, onQuit = ()=>{}
}) {
    const calculateMarginTop = () => {
        let size = 300;
        const $box = document.querySelector("#modal-box > div");
        if($box) size = $box.offsetHeight;

        size = Math.round((document.body.offsetHeight - size) / 2);
        if(size < 0) return 0;
        if(size > 250) return 250;
        return size;
    };
    const resizeHandler = debounce(() => {
        setMarginTop(calculateMarginTop())
    }, 100)
    const keydownHandler = (e) => {
        if(e.keyCode === 27){
            onQuit();
        }
    };
    const onClick = (e) => {
        if(e.target.getAttribute("id") === "modal-box"){
            onQuit();
        }
    };

    const [marginTop, setMarginTop] = useState(calculateMarginTop());
    useEffect(() => {
        window.addEventListener("resize", resizeHandler);
        window.addEventListener("keydown", keydownHandler);
        return () => {
            window.removeEventListener("resize", resizeHandler);
            window.removeEventListener("keydown", keydownHandler);
        }
    });

    return (
        <ReactCSSTransitionGroup transitionName="modal" transitionLeaveTimeout={300} transitionEnterTimeout={300} transitionAppear={true} transitionAppearTimeout={300}>
            <NgIf key={"modal-"+isActive} cond={isActive}>
                <div className={"component_modal"+(className? " " + className : "")} onClick={onClick} id="modal-box">
                    <div style={{margin: marginTop+"px auto 0 auto", visibility: marginTop === -1 ? "hidden" : "visible"}}>
                        {children}
                    </div>
                </div>
            </NgIf>
        </ReactCSSTransitionGroup>
    );
}
