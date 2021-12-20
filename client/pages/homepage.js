import React, { useState, useEffect } from "react";
import { Redirect } from "react-router";

import { Session } from "../model/";
import { Loader } from "../components/";

export function HomePage() {
    const [redirection, setRedirection] = useState(null);

    useEffect(() => {
        Session.currentUser().then((res) => {
            if (res && res.is_authenticated === true) {
                setRedirection(res.home ? "/files" + res.home : "/files");
            } else {
                setRedirection("/login");
            }
        }).catch((err) => setRedirection("/login"));
    }, []);

    if (!redirection) {
        return ( <div> <Loader /> </div> );
    }
    return ( <Redirect to={redirection} /> );
}
