import { createElement, navigate } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { ApplicationError } from "../lib/error.js";
import ctrlError from "./ctrl_error.js";

import { getSession } from "../model/session.js";

import "../components/loader.js";

export default function(render) {
    const GET = new URLSearchParams(location.search);
    if (GET.get("error")) {
        ctrlError(new ApplicationError(
            GET.get("error"),
            GET.get("trace") || "server error from URL",
        ))(render);
        return;
    }

    render(createElement(`<component-loader></component-loader>`));

    effect(getSession().pipe(
        rxjs.tap(({ is_authenticated, home = "" }) => {
            if (is_authenticated !== true) return navigate("/login");
            return navigate(`/files${home}`);
        }),
        rxjs.catchError(() => navigate("/login")),
    ));
};
