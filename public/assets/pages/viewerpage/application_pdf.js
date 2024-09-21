import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, onLoad } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { createLoader } from "../../components/loader.js";
import { loadCSS, loadJS } from "../../helpers/loader.js";
import { join } from "../../lib/path.js";
import ctrlError from "../ctrl_error.js";

import { transition, getFilename, getDownloadUrl } from "./common.js";
import { renderMenubar, buttonDownload } from "./component_menubar.js";

import "../../components/icon.js";

const hasNativePDF = "application/pdf" in window.navigator.mimeTypes && !!window.chrome;

export default async function(render) {
    const ctrl = hasNativePDF ? ctrlPDFNative : ctrlPDFJs;
    ctrl(render);
}

function ctrlPDFNative(render) {
    const $page = createElement(`
        <div class="component_pdfviewer">
            <component-menubar></component-menubar>
            <div data-bind="pdf">
                <embed
                    class="hidden"
                    src="${getDownloadUrl()}#toolbar=0"
                    type="application/pdf"
                />
            </div>
        </div>
    `);
    render($page);
    renderMenubar(qs($page, "component-menubar"), buttonDownload(getFilename(), getDownloadUrl()));

    const removeLoader = createLoader(qs($page, `[data-bind="pdf"]`));
    effect(onLoad(qs($page, "embed")).pipe(
        removeLoader,
        rxjs.tap(($embed) => $embed.classList.remove("hidden")),
        rxjs.tap(($embed) => transition($embed)),
        rxjs.catchError(ctrlError()),
    ));
}

async function ctrlPDFJs(render) {
    const $page = createElement(`
        <div class="component_pdfviewer">
            <component-menubar></component-menubar>
            <div data-bind="pdf"></div>
        </div>
    `);
    render($page);

    const $container = qs($page, `[data-bind="pdf"]`);
    const createBr = () => $container.appendChild(document.createElement("br"));
    const removeLoader = createLoader($container);
    const base = qs(document.head, "base").getAttribute("href");
    effect(rxjs.from(window.pdfjsLib.getDocument(base + getDownloadUrl()).promise).pipe(
        removeLoader,
        rxjs.mergeMap(async(pdf) => {
            createBr();
            for (let i=0; i<pdf.numPages; i++) {
                const page = await pdf.getPage(i + 1);
                const viewport = page.getViewport({
                    scale: Math.min(
                        Math.max(document.body.clientWidth - 200, 0),
                        800,
                    ) / page.getViewport({ scale: 1 }).width,
                });
                const $canvas = document.createElement("canvas");
                $canvas.height = viewport.height;
                $canvas.width = viewport.width;
                $container.appendChild($canvas);
                if (window.env === "test") $canvas.getContext = () => null;
                await page.render({
                    canvasContext: $canvas.getContext("2d"),
                    viewport,
                });
                await new Promise((done) => window.requestAnimationFrame(done));
            }
            createBr();
        }),
        rxjs.catchError(ctrlError()),
    ));
}

export function init() {
    const deps = [
        loadCSS(import.meta.url, "./application_pdf.css"),
    ];
    if (!hasNativePDF) {
        deps.push(loadJS(import.meta.url, "../../lib/vendor/pdfjs/pdf.js", { type: "module" }));
        deps.push(loadJS(import.meta.url, "../../lib/vendor/pdfjs/pdf.worker.js", { type: "module" }).then(() => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = join(import.meta.url, "../../lib/vendor/pdfjs/pdf.worker.js");
        }));
    }
    return Promise.all(deps);
}
