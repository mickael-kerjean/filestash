import React, { useEffect } from "react";

import { Session } from "../model/";
import { Loader, ErrorPage } from "../components/";
import { cache } from "../helpers/";

function LogoutPageComponent({ error, history }) {
    useEffect(() => {
        Session.logout().then((res) => {
            cache.destroy();
            window.CONFIG["logout"] ?
                location.href = CONFIG["logout"] :
                history.push("/");
        }).catch((err) => error(err));
    }, []);

    return (
        <div> <Loader /> </div>
    );
}

export const LogoutPage = ErrorPage(LogoutPageComponent);
