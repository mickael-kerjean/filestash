import { createElement, navigate } from "../lib/skeleton/index.js";
import rxjs, { effect } from "../lib/rx.js";
import ajax from "../lib/ajax.js";

import ctrlError from "./ctrl_error.js";
import "../components/loader.js";

export default function(render) {
    const $page = createElement(`<component-loader></component-loader>`);
    render($page);

    effect(ajax({
        url: "/api/session",
        method: "DELETE",
        withCredentials: true,
    }).pipe(
        rxjs.delay(5000),
        rxjs.tap(() => navigate("/")),
        rxjs.catchError(ctrlError(render)),
    ));
}
