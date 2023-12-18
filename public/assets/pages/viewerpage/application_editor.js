import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { createLoader } from "../../components/loader.js";
import { loadCSS, loadJS } from "../../helpers/loader.js";
import ajax from "../../lib/ajax.js";

import ctrlError from "../ctrl_error.js";
import ctrlDownloader, { init as initDownloader } from "./application_downloader.js";
import { transition, getDownloadUrl } from "./common.js";

import "../../components/menubar.js";

const TIME_BEFORE_ABORT_EDIT = 5000;

export default async function(render) {
    const $page = createElement(`
        <div class="component_ide">
            <component-menubar class="hidden"></component-menubar>
            <div class="component_editor"></div>
        </div>
    `);
    render($page);

    const content$ = ajax(getDownloadUrl()).pipe(
        rxjs.map(({ response }) => response),
        rxjs.shareReplay(),
    );

    const removeLoader = createLoader($page);
    effect(rxjs.race(
        ajax(getDownloadUrl()).pipe(rxjs.map(({ response }) => response)),
        ajax("/about").pipe(rxjs.delay(TIME_BEFORE_ABORT_EDIT), rxjs.map(() => null)),
    ).pipe(
        rxjs.mergeMap((content) => {
            if (content === null || has_binary(content)) {
                return rxjs.from(initDownloader()).pipe(
                    removeLoader,
                    rxjs.mergeMap(() => {
                        ctrlDownloader(render);
                        return rxjs.EMPTY;
                    }),
                );
            }
            return rxjs.of(content);
        }),
        removeLoader,
        rxjs.tap((content) => {
            window.CodeMirror(qs($page, ".component_editor"), {
                value: content,
                lineNumbers: true,
                // mode: mode,
                // keyMap: ["emacs", "vim"].indexOf(CONFIG["editor"]) === -1 ?
                //     "sublime" : CONFIG["editor"],
                lineWrapping: true,
                // readOnly: !this.props.readonly,
                foldOptions: {
                    widget: "...",
                },
                matchBrackets: {},
                autoCloseBrackets: true,
                matchTags: { bothTags: true },
                autoCloseTags: true,
            });
            transition(qs($page, ".component_editor"));
            qs($page, "component-menubar").classList.remove("hidden");
        }),
        rxjs.catchError(ctrlError()),
    ))
}

function has_binary(str) {
    return /\ufffd/.test(str);
}

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "../../lib/vendor/codemirror/lib/codemirror.css"),
        loadJS(import.meta.url, "../../lib/vendor/codemirror/lib/codemirror.js"),
        loadCSS(import.meta.url, "./application_editor.css"),
    ]);
}
