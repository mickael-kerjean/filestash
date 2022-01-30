import React from "react";
import { currentShare } from "../../helpers/";
import "./appframe.scss";

export function AppFrame({ args, data }) {
    let error = null;
    if (!args) {
        error = "Missing configuration. Contact your administrator";
    } else if (!args.endpoint) {
        error = "Missing endpoint configuration. Contact your administrator";
    }
    if (error !== null) {
        return (
            <div className="component_appframe">
                <div className="error">{error}</div>
            </div>
        );
    }
    return (
        <div className="component_appframe">
            <iframe src={args.endpoint + "?path=" + data + "&share=" + currentShare()} />
        </div>
    );
}
