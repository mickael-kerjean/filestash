import { createElement, navigate } from "../lib/skeleton/index.js";
import rxjs, { effect } from "../lib/rxjs/index.js";
import ajax from "../lib/ajax/index.js";

import ctrlError from "./ctrl_error.js";
import "../components/icon.js";

export default function(render) {
    const $page = createElement(`
        <div class="center">
            <component-icon name="loading"></component-icon>
        </div>
    `);
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
