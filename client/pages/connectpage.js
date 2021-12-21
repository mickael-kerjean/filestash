import React, { useState, useEffect } from "react";

import "./connectpage.scss";
import { Session } from "../model/";
import { Container, NgShow, Loader, ErrorPage } from "../components/";
import { ForkMe, PoweredByFilestash, Form } from "./connectpage/";
import { cache, notify, urlParams } from "../helpers/";

function ConnectPageComponent({ error, history }) {
    const [isLoading, setIsLoading] = useState(true);
    const _GET = urlParams();

    const authenticate = (formData) => {
        return Session.authenticate(formData)
            .then(Session.currentUser)
            .then((user) => {
                if (formData["next"]) {
                    location = formData["next"];
                    return;
                }
                let url = "/files/";
                if (user["home"]) {
                    user["home"] = user["home"].replace(/^\/?(.*?)\/?$/, "$1").trim();
                    if (user["home"] !== "") url = `${url}${user["home"]}/`;
                }
                cache.destroy();
                history.push(url);
            });
    };

    const onFormSubmit = (formData) => {
        if ("oauth2" in formData) {
            setIsLoading(true);
            Session.oauth2(formData["oauth2"]).then((url) => {
                window.location.href = url;
            });
            return;
        }
        setIsLoading(true);
        authenticate({ ..._GET, ...formData }).catch((err) => {
            setIsLoading(false);
            notify.send(err, "error");
        });
    };

    const onFormChangeLoadingState = (onOrOff) => {
        // we might not want to update the UI when:
        // 1. user came from oauth2/oidc request
        // 2. user came from a form pointing to this page
        if (_GET["state"]) return;
        else if (_GET["type"]) return;
        setIsLoading(onOrOff);
    };

    useEffect(() => {
        if (_GET["state"]) { // oauth2/oidc
            authenticate({ ..._GET, type: _GET["state"] }).catch((err) => error(err));
        } else if (_GET["type"]) { // form using get
            authenticate(_GET).catch((err) => error(err));
        }
    }, []);

    return (
        <div className="component_page_connect">
            { window.CONFIG["fork_button"] && <ForkMe /> }
            <Container maxWidth="565px">
                { isLoading && <Loader /> }
                <NgShow cond={!isLoading}>
                    <Form onLoadingChange={onFormChangeLoadingState}
                        onError={error}
                        onSubmit={onFormSubmit} />
                    { window.CONFIG["fork_button"] && <PoweredByFilestash /> }
                </NgShow>
            </Container>
        </div>
    );
}

export const ConnectPage = ErrorPage(ConnectPageComponent);
