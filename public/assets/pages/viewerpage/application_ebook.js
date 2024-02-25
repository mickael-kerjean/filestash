import { createElement, onDestroy } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { loadJS, loadCSS } from "../../helpers/loader.js";
import { createLoader } from "../../components/loader.js";
import ctrlError from "../ctrl_error.js";

import { getDownloadUrl } from "./common.js";

import "../../components/menubar.js";

export default function(render) {
    const $page = createElement(`
        <div class="component_ebookviewer">
            <component-menubar></component-menubar>
            <div class="ebookviewer_container" data-bind="epub"></div>
        </div>
    `);
    render($page);

    const removeLoader = createLoader($page);
    const rendition$ = new rxjs.ReplaySubject(1);

    // feature1: setup the dom
    const setup$ = rxjs.of(qs($page, `[data-bind="epub"]`)).pipe(
        rxjs.mergeMap(async($epub) => {
            const book = new window.ePub.Book({
                replacements: "blobUrl",
            });
            const rendition = book.renderTo($epub, {
                height: "100%",
                width: "100%",
                flow: "scrolled-doc",
                method: "continuous",
                allowScriptedContent: false,
            });
            rendition.display();
            onDestroy(() => {
                book.destroy();
                rendition.destroy();
            });
            book.open(getDownloadUrl());
            await new Promise((done) => {
                rendition.hooks.render.register(() => {
                    rendition$.next(rendition);
                    done();
                });
            });
        }),
        removeLoader,
        rxjs.catchError(ctrlError()),
        rxjs.share(),
    );
    effect(setup$);

    // feature2: navigation
    effect(setup$.pipe(
        rxjs.mergeMap(() => rxjs.merge(
            rxjs.fromEvent(document, "keydown"),
            rendition$.pipe(rxjs.mergeMap(() => rxjs.fromEvent(qs(document, "iframe").contentDocument.body, "keydown"))),
        )),
        rxjs.map((e) => {
            switch (e.code) {
            case "Space": return (r) => r.next();
            case "ArrowRight": return (r) => r.next();
            case "PageDown": return (r) => r.next();
            case "ArrowLeft": return (r) => r.prev();
            case "PageUp": return (r) => r.prev();
            }
            return null;
        }),
        rxjs.mergeMap((fn) => fn === null
            ? rxjs.EMPTY
            : rendition$.asObservable().pipe(
                rxjs.first(),
                rxjs.tap((rendition) => fn(rendition))
            )),
        rxjs.catchError(ctrlError()),
    ));
}

export function init() {
    return Promise.all([
        loadJS(import.meta.url, "../../lib/vendor/epub/zip.min.js"),
        loadJS(import.meta.url, "../../lib/vendor/epub/epub.min.js"),
        loadCSS(import.meta.url, "./application_ebook.css"),
    ]);
}
