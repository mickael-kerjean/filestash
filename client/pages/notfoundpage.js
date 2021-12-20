import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import "./error.scss";

export function NotFoundPage({ history }) {
    const [t, setTimer] = useState(10);
    useEffect(() => {
        const timeout = window.setTimeout(() => {
            if (t == 0) {
                history.push("/");
                return;
            }
            setTimer(t - 1);
        }, 1000);

        return () => {
            clearTimeout(timeout);
        };
    }, [t]);

    return (
        <div className="component_page_notfound error-page">
            <h1>Oops!</h1>
            <h2>We can&apos;t seem to find the page you&apos;re looking for.</h2>
            <p>
                You will be redirected to the <Link to="/">homepage</Link> in {t} seconds
            </p>
        </div>
    );
}
