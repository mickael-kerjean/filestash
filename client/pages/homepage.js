import React, { useState, useEffect } from "react";
import { Redirect } from "react-router";

import { Session } from "../model/";
import { Loader, ErrorPage } from "../components/";
import { t } from "../locales/";

function HomePageComponent({ error }) {
    const [redirection, setRedirection] = useState(null);

    useEffect(() => {
        const p = new URLSearchParams(location.search);
        if (p.get("error")) {
            error(new Error(t(p.get("error"))));
            return;
        }

        Session.currentUser().then((res) => {
            if (res && res.is_authenticated === true) {
                setRedirection(res.home ? `/files${res.home}` : "/files");
                return;
            }
            setRedirection("/login");
        }).catch((err) => setRedirection("/login"));
    }, []);

    if (!redirection) {
        return ( <div> <Loader /> </div> );
    }
    if (redirection === "/login") {
        location.href = redirection;
        return (<div></div>);
    }
    return ( <Redirect to={redirection} /> );
}

export const HomePage = ErrorPage(HomePageComponent);
