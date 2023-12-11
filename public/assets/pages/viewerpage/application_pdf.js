import { createElement } from "../../lib/skeleton/index.js";
import { animate, opacityIn } from "../../lib/animate.js";
import { qs } from "../../lib/dom.js";
import { loadCSS, loadJS } from "../../helpers/loader.js";
import { join } from "../../lib/path.js";

import { getFilename, getDownloadUrl } from "./common.js";

import "../../components/menubar.js";
import "../../components/icon.js";

const hasNativePDF = "application/pdf" in navigator.mimeTypes;

export default async function(render) {
    hasNativePDF ? pdfNative(render) : pdfJs(render);
}

export function init() {
    if (hasNativePDF) return Promise.resolve();

    return Promise.all([
        loadJS(import.meta.url, "../../lib/vendor/pdfjs/pdf.js", { type: "module" }),
        loadJS(import.meta.url, "../../lib/vendor/pdfjs/pdf.worker.js", { type: "module" }),
        loadCSS(import.meta.url, "./application_pdf.css"),
    ]).then(() => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = join(import.meta.url, "../../lib/vendor/pdfjs/pdf.worker.js");
    });
}

function pdfNative(render) {
    const $page = createElement(`
        <div class="component_pdfviewer" style="background: #525659">
            <component-menubar></component-menubar>
            <embed
                style="width:100%;height:100%;opacity:0"
                src="${getDownloadUrl()}#toolbar=0"
                type="application/pdf"
            />
        </div>
    `);
    render($page);

    const $embed = $page.querySelector("embed");
    $embed.onload = () => {
        $embed.style.opacity = 1;
        animate($embed, { time: 300, keyframes: opacityIn() });
    };
}

async function pdfJs(render) {
    const $page = createElement(`
        <div class="component_pdfviewer" style="background: #525659;text-align:center;">
            <component-menubar></component-menubar>
            <div data-bind="pdf"></div>
        </div>
    `);
    render($page);


    const createBr = () => $container.appendChild(document.createElement("br"));
    const $container = qs($page, `[data-bind="pdf"]`);
    const timeoutID = window.setTimeout(() => {
        const $icon = createElement(`<component-icon name="loading"></component-icon>`);
        $container.appendChild($icon);
    }, 300);
    const pdf = await pdfjsLib.getDocument(getDownloadUrl()).promise;
    clearTimeout(timeoutID);
    $container.innerHTML = "";
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
	    await page.render({
		    canvasContext: $canvas.getContext("2d"),
		    viewport: viewport,
	    });
        if (i % 5 === 0) await new Promise((done) => requestAnimationFrame(done));
    }
    for (let i=0; i<4; i++) createBr();
}
