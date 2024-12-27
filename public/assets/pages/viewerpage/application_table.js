import { createElement, nop } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { qs, qsa } from "../../lib/dom.js";
import ajax from "../../lib/ajax.js";
import { loadCSS } from "../../helpers/loader.js";
import ctrlError from "../ctrl_error.js";

import { renderMenubar, buttonDownload } from "./component_menubar.js";

export default async function(render, { getDownloadUrl = nop, getFilename = nop, hasMenubar = true }) {
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

    // feature: initial render
    const init$ = ajax({ url: getDownloadUrl(), responseType: "arraybuffer" }).pipe(
        rxjs.mergeMap(async({ response }) => {
            const module = await import("../../lib/vendor/shp-to-geojson.browser.js");
            const data = new module.DBase(module.Buffer.from(response));

            const dummy = [];
            // const dummy = new Array(50).fill({}).map((_, i) => ({
            //     fieldName: "dummy"+i,
            //     fieldLength: 4,
            // }));
            data.properties = data.properties.concat(dummy);

            // build head
            const $tr = createElement(`<div class="tr"></div>`);
            data.properties.forEach(({ fieldName, fieldLength }) => {
                const $th = createElement(`
                    <div title="${fieldName}" class="${withCenter("th ellipsis", fieldLength)}" style="${styleCell(fieldLength, fieldName, padding)}">
                        ${fieldName}
                        <img class="no-select" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+CiAgPHBhdGggc3R5bGU9ImZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MC41MzMzMzMyMSIgZD0ibSA3LjcwNSw4LjA0NSA0LjU5LDQuNTggNC41OSwtNC41OCAxLjQxLDEuNDEgLTYsNiAtNiwtNiB6IiAvPgogIDxwYXRoIGZpbGw9Im5vbmUiIGQ9Ik0wLS4yNWgyNHYyNEgweiIgLz4KPC9zdmc+Cg==" />
                    </div>
                `);
                let ascending = null;
                qs($th, "img").onclick = (e) => {
                    ascending = !ascending;
                    sortBy(qsa($dom.tbody, `.tr [data-column="${fieldName}"]`), ascending);
                    qsa(e.target.closest(".tr"), "img").forEach(($img) => {
                        $img.style.transform = "rotate(0deg)";
                    });
                    if (ascending) e.target.style.transform = "rotate(180deg)";
                };
                $tr.appendChild($th);
            });
            $dom.thead.appendChild($tr);

            // build body
            for (let i =0; i<data.recordLength; i++) {
                const row = data.getRowProperties(i);
                const $tr = createElement(`<div class="tr"></div>`);
                data.properties.forEach(({ fieldName, fieldLength }) => {
                    $tr.appendChild(createElement(`
                        <div data-column="${fieldName}" title="${row[fieldName]}" class="${withCenter("td ellipsis", fieldLength)}" style="${styleCell(fieldLength, fieldName, padding)}">
                            ${row[fieldName] || "<span class=\"empty\">-</span>"}
                        </div>
                    `));
                });
                $dom.tbody.appendChild($tr);
            }
        }),
        rxjs.share(),
        rxjs.catchError(ctrlError()),
    );
    effect(init$);

    // feature: search
    const $search = createElement(`<input type="search" placeholder="search">`);
    $menubar.add($search);
    effect(rxjs.fromEvent($search, "keydown").pipe(
        rxjs.debounceTime(200),
        rxjs.tap((e) => {
            const terms = e.target.value.toLowerCase().split(" ");
            qsa($page, ".table .tbody .tr").forEach(($row) => {
                const str = $row.innerText.toLowerCase();
                for (let i=0; i<terms.length; i++) {
                    if (str.indexOf(terms[i]) === -1) {
                        $row.classList.add("hidden");
                        return;
                    }
                }
                $row.classList.remove("hidden");
            });
        }),
    ));

    // feature: fixed header scroll along
    effect(rxjs.fromEvent($dom.tbody, "scroll").pipe(
        rxjs.tap(() => $dom.thead.scrollTo($dom.tbody.scrollLeft, 0))
    ));
    effect(rxjs.fromEvent($dom.thead, "scroll").pipe(
        rxjs.tap(() => $dom.tbody.scrollTo($dom.thead.scrollLeft, $dom.tbody.scrollTop))
    ));

    // feature: make the last column to always fit the viewport
    effect(rxjs.merge(
        init$,
        init$.pipe(
            rxjs.mergeMap(() => rxjs.fromEvent(window, "resize")),
            rxjs.debounceTime(100),
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

function styleCell(l, name, padding) {
    const maxSize = 40;
    const charSize = 7;
    let sizeInChar = Math.min(l, maxSize);
    if (name.length >= sizeInChar) sizeInChar = Math.min(name.length + 1, maxSize);
    return `width: ${sizeInChar*charSize+padding*2}px;`;
}

function withCenter(className, fieldLength) {
    if (fieldLength > 4) return className;
    return `${className} center`;
}

function resizeLastColumnIfNeeded({ $target, $childs, padding = 0 }) {
    const fullWidth = $target.clientWidth;
    let currWidth = 0;
    $childs.childNodes.forEach(($node) => currWidth += $node.clientWidth);
    if (currWidth < fullWidth) {
        const lastWidth = ($childs.lastChild.clientWidth - padding * 2) + fullWidth - currWidth;
        $childs.lastChild.setAttribute("style", `width: ${lastWidth}px`);
    }
}

function sortBy($columns, ascending) {
    const o = ascending ? 1 : -1;
    const $new = [...$columns].sort(($el1, $el2) => {
        if ($el1.innerText === $el2.innerText) return 0;
        else if ($el1.innerText < $el2.innerText) return -o;
        return o;
    });
    const $root = $columns[0].parentElement.parentElement;
    $root.innerHTML = "";
    $new.forEach(($node) => $root.appendChild($node.parentElement));
}
