import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
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
            const match = assert.truthy(content.match(new RegExp("https?://\\S+")), "No URL found");
            const url = new URL(match[0]);
            assert.truthy(url.protocol === "http:" || url.protocol === "https:", "Unsupported protocol");
            location.replace(url.href);
        }),
        rxjs.catchError(ctrlError()),
    ));
}
