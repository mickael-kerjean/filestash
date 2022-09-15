import React, { useEffect, useState } from "react";
import { Redirect } from "react-router-dom";

import "./about.scss";

export function AboutPage() {
    const [version, setVersion] = useState("Filestash/vxxxx");
    useEffect(() => {
        const controller = new AbortController();
        fetch(window.sub_folder + "/about", { signal: controller.signal })
            .then((r) => r.text())
            .then((r) => {
                const a = document.createElement("html")
                a.innerHTML = r;
                document.getElementById("about-page").innerHTML = a.querySelector("table").outerHTML
            });
        return () => controller.abort();
    }, [])

    return (
        <div id="about-page" />
    );
}
