import { createElement, navigate } from "../../lib/skeleton/index.js";
import { toHref } from "../../lib/skeleton/router.js";
import rxjs, { effect } from "../../lib/rx.js";
import { ApplicationError } from "../../lib/error.js";
import assert from "../../lib/assert.js";
import { createLoader } from "../../components/loader.js";
import ctrlError from "../ctrl_error.js";
import { cat } from "./model_files.js";

export default function(render, { getDownloadUrl }) {
    const $page = createElement(`
        <div class="component_urlopener" style="background: var(--surface);"></div>
    `);
    render($page);
    createLoader($page);

    effect(cat(getDownloadUrl()).pipe(
        rxjs.tap((content) => {
            const url = content.replace(/[\s\S]*(https?:\/\/\S+)[\s\S]*/, "$1");
            try {
                new URL(url); // throws on invalid URL
                location.replace(url);
            } catch (err) {
                const message = assert.type(err, window.Error).message;
                throw new ApplicationError("Not Valid", message);
            }
        }),
        rxjs.catchError(ctrlError()),
    ));
}
