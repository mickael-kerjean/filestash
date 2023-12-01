import { createElement, navigate } from "../lib/skeleton/index.js";
import rxjs, { effect } from "../lib/rx.js";
import { ApplicationError, AjaxError } from "../lib/error.js";
import ctrlError from "./ctrl_error.js";

import { getSession } from "../model/session.js";

import "../components/loader.js";

export default function(render) {
    render(createElement("<component-loader></component-loader>"));

    // feature1: trigger error page via url params
    const GET = new URLSearchParams(location.search);
    const err = GET.get("error");
    if (err) {
        ctrlError(render)(new ApplicationError(
            err,
            GET.get("trace") || "server error from URL",
        ));
        return;
    }

    // feature2: redirect user where it makes most sense
    effect(getSession().pipe(
        rxjs.catchError((err) => {
            if (err instanceof AjaxError && err.err().status === 401) {
                return rxjs.of({ is_authenticated: false });
            }
            return rxjs.throwError(err);
        }),
        rxjs.tap(({ is_authenticated, home = "/" }) => {
            if (is_authenticated !== true) return navigate("/login");
            return navigate(`/files${home}`);
        }),
        rxjs.catchError(ctrlError(render)),
    ));
};
