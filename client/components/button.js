import React from "react";

import "./button.scss";

export function Button({ theme = "", children = null, className = "", ...props }) {
    return (
        <button {...props} className={`${className} ${theme}`.trim()}>
            { children }
        </button>
    );
}
