import { createElement, nop } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { qs, qsa } from "../../lib/dom.js";
import ajax from "../../lib/ajax.js";
import { loadCSS } from "../../helpers/loader.js";
import t from "../../locales/index.js";
import { get as getPlugin } from "../../model/plugin.js";
import ctrlError from "../ctrl_error.js";

import { renderMenubar, buttonDownload } from "./component_menubar.js";
import { transition } from "./common.js";

const MAX_ROWS = 200;

class ITable {
    contructor() {}
    getHeader() { throw new Error("NOT_IMPLEMENTED"); }
    getBody() { throw new Error("NOT_IMPLEMENTED"); }
}

export default async function(render, { mime, getDownloadUrl = nop, getFilename = nop, hasMenubar = true }) {
    const $page = createElement(`
        <div class="component_tableviewer">
            <component-menubar filename="${getFilename()}" class="${!hasMenubar && "hidden"}"></component-menubar>
            <div class="component_table_container">
                <table class="table">
                    <thead class="thead"></thead>
                    <tbody class="tbody"></tbody>
                </div>
            </div>
        </div>
    `);
    render($page);
    const $menubar = renderMenubar(
        qs($page, "component-menubar"),
        buttonDownload(getFilename(), getDownloadUrl()),
    );
    const $dom = {
        thead: qs($page, ".thead"),
        tbody: qs($page, ".tbody"),
    };
    const padding = 10;
    const STATE = {
        header: {},
        body: [],
        rows: [],
    };

    // feature: initial render
    const init$ = ajax({ url: getDownloadUrl(), responseType: "arraybuffer" }).pipe(
        rxjs.mergeMap(async({ response }) => {
            const loader = getPlugin(mime);
            if (!loader) throw new TypeError(`unsupported mimetype "${mime}"`);
            const [_, url] = loader;
            const module = await import(url);
            const table = new (await module.default(ITable))(response, { $menubar });
            STATE.header = table.getHeader();
            STATE.body = table.getBody();
            STATE.rows = STATE.body;

            buildHead(STATE, $dom, padding);
            buildRows(STATE.rows.slice(0, MAX_ROWS), STATE.header, $dom.tbody, padding, true, false);
        }),
        rxjs.catchError(ctrlError()),
        rxjs.share(),
    );
    effect(init$);

    // feature: search
    const $search = createElement(`<input type="search" placeholder="search">`);
    effect(init$.pipe(
        rxjs.tap(() => $menubar.add($search)),
        rxjs.mergeMap(() => rxjs.fromEvent($search, "keydown").pipe(rxjs.debounceTime(200))),
        rxjs.tap((e) => {
            const terms = e.target.value.toLowerCase().trim().split(" ");
            $dom.tbody.scrollTo(0, 0);
            if (terms === "") STATE.rows = STATE.body;
            else STATE.rows = STATE.body.filter((row) => {
                const line = Object.values(row).join("").toLowerCase();
                for (let i=0; i<terms.length; i++) {
                    if (line.indexOf(terms[i]) === -1) {
                        return false;
                    }
                }
                return true;
            });
            buildRows(STATE.rows.slice(0, MAX_ROWS), STATE.header, $dom.tbody, padding, false, true);
        }),
    ));

    // feature: fixed header scroll along
    effect(rxjs.fromEvent($dom.tbody, "scroll").pipe(
        rxjs.tap(() => $dom.thead.scrollTo($dom.tbody.scrollLeft, 0))
    ));
    effect(rxjs.fromEvent($dom.thead, "scroll").pipe(
        rxjs.tap(() => $dom.tbody.scrollTo($dom.thead.scrollLeft, $dom.tbody.scrollTop))
    ));

    // feature: infinite scroll
    effect(rxjs.fromEvent($dom.tbody, "scroll").pipe(
        rxjs.mergeMap(async (e) => {
            const scrollBottom = e.target.scrollHeight - (e.target.scrollTop + e.target.clientHeight);
            if (scrollBottom > 0) return;
            else if (STATE.rows.length <= MAX_ROWS) return;
            else if (STATE.rows.length <= $dom.tbody.children.length) return;

            const current = $dom.tbody.children.length;
            const newRows = STATE.rows.slice(current, current + 10);
            buildRows(newRows, STATE.header, $dom.tbody, padding, false, false);
        }),
    ));

    // feature: make the last column to always fit the viewport
    effect(rxjs.merge(
        init$,
        init$.pipe(
            rxjs.mergeMap(() => rxjs.fromEvent(window, "resize")),
            rxjs.debounce((e) => e.debounce === false ? rxjs.of(null) : rxjs.timer(100)),
        ),
    ).pipe(
        rxjs.tap(() => resizeLastColumnIfNeeded({
            $target: $dom.thead,
            $childs: qs($dom.thead, ".tr"),
            padding,
        })),
        rxjs.tap(() => qsa($dom.tbody, ".tr").forEach(($tr) => resizeLastColumnIfNeeded({
            $target: $dom.tbody,
            $childs: $tr,
            padding,
        }))),
    ));
}

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "./application_table.css"),
    ]);
}

async function buildRows(rows, legends, $tbody, padding, isInit, withClear) {
    if (withClear) $tbody.innerHTML = "";
    for (let i=0; i<rows.length; i++) {
        const obj = rows[i];
        const $tr = createElement(`<div class="tr"></div>`);
        legends.forEach(({ name, size }, i) => {
            $tr.appendChild(createElement(`
                <div data-column="${name}" title="${obj[name]}" class="${withCenter("td ellipsis", size, i === legends.length -1)}" style="${styleCell(size, name, padding)}">
                    ${obj[name] || "<span class=\"empty\">-</span>"}
                </div>
            `));
        });
        $tbody.appendChild($tr);
    }
    $tbody.style.opacity = "0";
    if (rows.length === 0) $tbody.appendChild(createElement(`
        <h3 class="center no-select" style="opacity:0.2; margin-top:30px">
            ${t("Empty")}
        </h3>
    `));
    if (!isInit) {
        const e = new Event("resize");
        e.debounce = false;
        window.dispatchEvent(e);
        await new Promise(requestAnimationFrame);
    }
    $tbody.style.opacity = "1";
    if (isInit) transition($tbody.parentElement);
}

function buildHead(STATE, $dom, padding) {
    const $tr = createElement(`<div class="tr"></div>`);
    STATE.header.forEach(({ name, size }, i) => {
        const $th = createElement(`
            <div title="${name}" class="${withCenter("th ellipsis", size, i === STATE.header.length - 1)}" style="${styleCell(size, name, padding)}">
                ${name}
                <img class="no-select" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+CiAgPHBhdGggc3R5bGU9ImZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MC41MzMzMzMyMSIgZD0ibSA3LjcwNSw4LjA0NSA0LjU5LDQuNTggNC41OSwtNC41OCAxLjQxLDEuNDEgLTYsNiAtNiwtNiB6IiAvPgogIDxwYXRoIGZpbGw9Im5vbmUiIGQ9Ik0wLS4yNWgyNHYyNEgweiIgLz4KPC9zdmc+Cg==" />
            </div>
        `);
        let ascending = null;
        qs($th, "img").onclick = (e) => {
            ascending = !ascending;
            STATE.rows = sortBy(STATE.rows, ascending, name);
            qsa(e.target.closest(".tr"), "img").forEach(($img) => {
                $img.style.transform = "rotate(0deg)";
            });
            if (ascending) e.target.style.transform = "rotate(180deg)";
            $dom.tbody.scrollTo(0, 0);
            buildRows(STATE.rows.slice(0, MAX_ROWS), STATE.header, $dom.tbody, padding, false, true);
        };
        $tr.appendChild($th);
    });
    $dom.thead.appendChild($tr);
}

function styleCell(l, name, padding) {
    const maxSize = 40;
    const charSize = 7;
    let sizeInChar = Math.min(l, maxSize);
    if (name.length >= sizeInChar) sizeInChar = Math.min(name.length + 1, maxSize);
    return `width: ${sizeInChar*charSize+padding*2}px;`;
}

function withCenter(className, fieldLength, isLast) {
    if (fieldLength > 4 || isLast) return className;
    return `${className} center`;
}

function resizeLastColumnIfNeeded({ $target, $childs, padding = 0 }) {
    const fullWidth = $target.clientWidth;
    let currWidth = 0;
    $childs.childNodes.forEach(($node) => currWidth += $node.clientWidth);
    if (currWidth < fullWidth && $childs.lastChild !== null) {
        const lastWidth = ($childs.lastChild.clientWidth - padding * 2) + fullWidth - currWidth;
        $childs.lastChild.setAttribute("style", `width: ${lastWidth}px`);
    }
}

function sortBy(rows, ascending, key) {
    const o = ascending ? 1 : -1;
    return rows.sort((a, b) => {
        if (a[key] === b[key]) return 0;
        else if (a[key] < b[key]) return -o
        return o;
    });
}
