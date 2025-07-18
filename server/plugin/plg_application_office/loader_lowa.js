import { createElement, onDestroy } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";
import { qs } from "../../lib/dom.js";
import { join } from "../../lib/path.js";
import { loadJS, loadCSS } from "../../helpers/loader.js";
import { buttonDownload } from "../../pages/viewerpage/component_menubar.js";
import { $ICON } from "../../pages/viewerpage/common_fab.js";
import { save } from "../../pages/viewerpage/model_files.js";
import "../../components/fab.js";

import { $toolbar } from "./lib/dom.js";

await loadCSS(import.meta.url, "./loader_lowa.css");

let $canvas = null;
window.Module = {
    uno_scripts: [join(import.meta.url, "./lib/lowa/zeta.js"), join(import.meta.url, "./loader_lowa.uno.js")],
    locateFile: (path, prefix) => (prefix || join(import.meta.url, "./lib/lowa/")) + path,
};

export default async function(render, { mime, getDownloadUrl, getFilename, $menubar, acl$ }) {
    const canWrite = (await acl$.toPromise()).indexOf("POST") >= 0;
    const $page = createElement(`
        <div class="component_word">
            <canvas id="qtcanvas" contenteditable="${canWrite}" style="visibility:hidden"></canvas>
            <button is="component-fab" class="hidden"></button>
        </div>
    `);
    render($page);

    // feature1: init
    const filename = getFilename();
    const $fab = qs($page, `[is="component-fab"]`);
    const $qcanvas = qs($page, "canvas");
    if ($canvas) {
        $qcanvas.remove();
        $page.appendChild($canvas);
    } else {
        $canvas = $qcanvas;
    }
    Object.assign($canvas.style, {
        width: "100%",
        height: "100%",
    });

    // feature2: toolbar init
    if (canWrite) {
        $menubar.add(buttonDownload(filename, getDownloadUrl()));
        if (isWriter(mime)) {
            $menubar.add($toolbar.bullet);
            $menubar.add($toolbar.alignment);
            $menubar.add($toolbar.title);
        }
        $menubar.add($toolbar.size);
        $menubar.add($toolbar.strike);
        $menubar.add($toolbar.underline);
        $menubar.add($toolbar.italic);
        $menubar.add($toolbar.bold);
        $menubar.add($toolbar.color);
    }

    // feature3: setup lowa
    window.Module.canvas = $canvas;
    await loadJS(import.meta.url, "./lib/lowa/soffice.js");
    let port = await Module.uno_main;
    onDestroy(() => {
        $canvas.style.visibility = "hidden";
        port.postMessage({ cmd: "destroy", mime });
    });

    // feature4: display rule for save button
    const action$ = new rxjs.Subject();
    if (canWrite) effect(rxjs.merge(rxjs.fromEvent($canvas, "keyup"), action$).pipe(rxjs.tap(() => {
        $fab.classList.remove("hidden");
        $fab.render($ICON.SAVING);
        $fab.onclick = () => {
            $fab.render($ICON.LOADING);
            $fab.disabled = true;
            port.postMessage({ cmd: "save" });
        };
    })));

    // feature5: load file
    await effect(ajax({ url: getDownloadUrl(), responseType: "arraybuffer" }).pipe(
        rxjs.mergeMap(async ({ response }) => {
            try { FS.mkdir("/tmp/office/"); } catch {}
            await FS.writeFile("/tmp/office/" + filename , new Uint8Array(response));
            await port.postMessage({ cmd: "load", filename, mime });
            onDestroy(() => FS.unlink("/tmp/office/" + filename));
            $canvas.focus();
        }),
    ));
    await new Promise((resolve) => {
        port.onmessage = function(e) {
            switch (e.data.cmd) {
            case "loaded":
                window.dispatchEvent(new Event("resize"));
                setTimeout(() => {
                    resolve();
                    $canvas.style.visibility = "visible";
                }, 250);
                break;
            case "save":
                const bytes = FS.readFile("/tmp/office/" + filename);
                effect(save(new Blob([bytes], {})).pipe(rxjs.tap(() => {
                    $fab.classList.add("hidden");
                    $fab.render($ICON.SAVING);
                    $fab.disabled = false;
                })));
                break;
            case "setFormat":
                switch(e.data.id) {
                case "Bold":
                    e.data.state ? $toolbar.bold.classList.add("active") : $toolbar.bold.classList.remove("active");
                    break;
                case "Italic":
                    e.data.state ? $toolbar.italic.classList.add("active") : $toolbar.italic.classList.remove("active");
                    break;
                case "Underline":
                    e.data.state ? $toolbar.underline.classList.add("active") : $toolbar.underline.classList.remove("active");
                    break;
                case "Strikeout":
                    e.data.state ? $toolbar.strike.classList.add("active") : $toolbar.strike.classList.remove("active");
                    break;
                case "LeftPara":
                    if (e.data.state) qs($toolbar.alignment, "select").value = "left";
                    break;
                case "RightPara":
                    if (e.data.state) qs($toolbar.alignment, "select").value = "right";
                    break;
                case "CenterPara":
                    if (e.data.state) qs($toolbar.alignment, "select").value = "center";
                    break;
                case "JustifyPara":
                    if (e.data.state) qs($toolbar.alignment, "select").value = "justify";
                    break;
                case "DefaultBullet":
                    qs($toolbar.bullet, "select").value = e.data.state ? "ul" : "normal";
                    break;
                case "DefaultNumbering":
                    qs($toolbar.bullet, "select").value = e.data.state ? "ol" : "normal";
                    break;
                case "StyleApply":
                    let value = "normal";
                    if (e.data.state === "Title") value = "title";
                    else if (e.data.state === "Heading 1") value = "head1";
                    else if (e.data.state === "Heading 2") value = "head2";
                    else if (e.data.state === "Heading 3") value = "head3";
                    qs($toolbar.title, "select").value = value;
                    break;
                case "Color":
                    const hex = e.data.state && e.data.state > 0 ? "#" + e.data.state.toString(16).padStart(6, "0") : "#000000";
                    $toolbar.color.children[0].style.fill = hex;
                    $toolbar.color.children[1].value = hex;
                    break;
                case "FontHeight":
                    const fontSize = e.data.state;
                    qs($toolbar.size, "input").value = fontSize;
                    break;
                default:
                    console.log("format", e);
                    throw new Error("Unknown format");
                }
                $canvas.focus();
                break;
            default:
                console.log("message", e);
                throw new Error("Unknown message");
            }
        };
    });

    // feature6: toolbar events
    $toolbar.bold.onclick = () => {
        $toolbar.bold.classList.toggle("active");
        action$.next();
        port.postMessage({ cmd: "toggleFormatting", id: "Bold" });
    };
    $toolbar.italic.onclick = () => {
        $toolbar.italic.classList.toggle("active");
        action$.next();
        port.postMessage({ cmd: "toggleFormatting", id: "Italic" });
    };
    $toolbar.underline.onclick = () => {
        $toolbar.underline.classList.toggle("active");
        action$.next();
        port.postMessage({ cmd: "toggleFormatting", id: "Underline" });
    };
    $toolbar.bullet.onchange = (e) => {
        switch(e.target.value) {
        case "normal":
            port.postMessage({ cmd: "toggleFormatting", id: "RemoveBullets" });
            break;
        case "ul":
            port.postMessage({ cmd: "toggleFormatting", id: "DefaultBullet" });
            break;
        case "ol":
            port.postMessage({ cmd: "toggleFormatting", id: "DefaultNumbering" });
            break;
        }
        action$.next();
    };
    $toolbar.strike.onclick = () => {
        $toolbar.strike.classList.toggle("active");
        action$.next();
        port.postMessage({ cmd: "toggleFormatting", id: "Strikeout" });
    };
    $toolbar.alignment.onchange = (e) => {
        switch(e.target.value) {
        case "left":
            port.postMessage({ cmd: "toggleFormatting", id: "LeftPara" });
            break;
        case "right":
            port.postMessage({ cmd: "toggleFormatting", id: "RightPara" });
            break;
        case "center":
            port.postMessage({ cmd: "toggleFormatting", id: "CenterPara" });
            break;
        case "justify":
            port.postMessage({ cmd: "toggleFormatting", id: "JustifyPara" });
            break;
        default:
            throw new Error("Unknown tool alignment");
        }
        action$.next();
    };
    $toolbar.title.onchange = (e) => {
        switch(e.target.value) {
        case "normal":
            port.postMessage({ cmd: "toggleFormatting", id: "StyleApply?Style:string=Standard&FamilyName:string=ParagraphStyles" });
            break;
        case "title":
            port.postMessage({ cmd: "toggleFormatting", id: "StyleApply?Style:string=Title&FamilyName:string=ParagraphStyles" });
            break;
        case "head1":
            port.postMessage({ cmd: "toggleFormatting", id: "StyleApply?Style:string=Heading 1&FamilyName:string=ParagraphStyles" });
            break;
        case "head2":
            port.postMessage({ cmd: "toggleFormatting", id: "StyleApply?Style:string=Heading 2&FamilyName:string=ParagraphStyles" });
            break;
        case "head3":
            port.postMessage({ cmd: "toggleFormatting", id: "StyleApply?Style:string=Heading 3&FamilyName:string=ParagraphStyles" });
            break;
        default:
            throw new Error("Unknown text style");
        }
        action$.next();
    };
    $toolbar.color.onclick = (e) => {
        if (e.target.tagName === "INPUT") return;
        const $svg = e.target.closest("svg")
        const $input = $svg.nextElementSibling;
        $input.onchange = (e) => {
            $svg.style.fill = e.target.value;
            const color = parseInt(e.target.value.slice(1), 16);
            port.postMessage({ cmd: "toggleFormatting", id: `Color?Color:long=${color}` })
        };
        $input.click();
        action$.next();
    };
    effect(rxjs.fromEvent(qs($toolbar.size, "input"), "keyup").pipe(
        rxjs.debounceTime(250),
        rxjs.tap((e) => {
            const fontSize = parseInt(e.target.value);
            port.postMessage({ cmd: "toggleFormatting", id: `FontHeight?FontHeight.Height:float=${fontSize}` });
            action$.next();
        }),
    ));

    // feature7: workaround known lowa bug
    // - when pressing escape, lowa goes out of fullscreen and show some unwanted stuff
    // - context menu functions like "replace" image which does crash everything with errors generated from soffice.js
    // - ctrl + s is broken
    effect(rxjs.fromEvent($page, "keydown", { capture: true }).pipe(rxjs.tap((e) => {
        if (e.key === "Escape") e.stopPropagation();
        if (e.key === "s" && e.ctrlKey) e.stopPropagation();
    })));
    effect(rxjs.fromEvent($page, "mousedown", { capture: true }).pipe(rxjs.tap((e) => {
        if (e.which === 3) e.stopPropagation();
    })));
}

function isWriter(mime) {
    return ["application/word", "application/msword", "application/rtf", "application/vnd.oasis.opendocument.text"].indexOf(mime) >= 0;
}
