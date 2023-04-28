import React, { useRef, useEffect } from "react";
import { currentShare, notify } from "../../helpers/";
import { t } from "../../locales/";
import "./appframe.scss";

export function AppFrame({ args, data }) {
    useEffect(() => {
        const messageHandler = (event) => {
            console.log(event)
            if (event.origin !== location.origin) return;
            switch(event.data.type) {
            case "notify::info":
                notify.send(t(event.data.message), "info");
                break;
            case "notify::error":
                notify.send(t(event.data.message), "error");
                break
            }
        };
        window.addEventListener("message", messageHandler);
        return () => window.removeEventListener("message", messageHandler);
    }, []);

    let error = null;
    if (!args) {
        error = "Missing configuration. Contact your administrator";
    } else if (!args.endpoint) {
        error = "Missing endpoint configuration. Contact your administrator";
    }
    return (
        <div className="component_appframe">
            {
                error === null ? (
                    <iframe src={args.endpoint + "?path=" + data + "&share=" + currentShare()} />
                ) : (
                    <div className="error">{error}</div>
                )
            }

        </div>
    );
}
