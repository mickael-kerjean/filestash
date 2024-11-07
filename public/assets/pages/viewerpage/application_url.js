import { createElement, navigate } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { ApplicationError } from "../../lib/error.js";
import { createLoader } from "../../components/loader.js";
import ctrlError from "../ctrl_error.js";
import { cat } from "./model_files.js";

export default function(render) {
    const $page = createElement(`
        <div class="component_urlopener" style="background: #52565911;"></div>
    `);
    render($page);
    createLoader($page);

    effect(cat().pipe(
        rxjs.tap((content) => {
            const url = content.replace(/[\s\S]*(https?:\/\/\S+)[\s\S]*/, "$1");
            try {
                const u = new URL(url);
                if (u.host === location.host) {
                    navigate(u.href.replace(u.origin, ""));
                    return;
                }
                location.href = url;
            } catch(err) {
                throw new ApplicationError("Not Valid", err);
            }
        }),
        rxjs.catchError(ctrlError()),
    ));
}
