import { createElement, createRender, createFragment, onDestroy } from "../../lib/skeleton/index.js";
import rxjs, { effect, onClick, preventDefault } from "../../lib/rx.js";
import { animate, slideXIn, slideYIn } from "../../lib/animate.js";
import { basename, forwardURLParams } from "../../lib/path.js";
import assert from "../../lib/assert.js";
import { qs, qsa } from "../../lib/dom.js";
import { get as getConfig } from "../../model/config.js";
import { loadCSS } from "../../helpers/loader.js";
import t from "../../locales/index.js";

import "../../components/dropdown.js";
import "../../components/icon.js";
import { createModal } from "../../components/modal.js";

import componentShare from "./modal_share.js";
import componentTag from "./modal_tag.js";
import componentRename from "./modal_rename.js";
import componentDelete from "./modal_delete.js";

import { getSelection$, clearSelection, lengthSelection, expandSelection } from "./state_selection.js";
import { getAction$, setAction } from "./state_newthing.js";
import { setState, getState$ } from "./state_config.js";
import { clearCache } from "./cache.js";
import { getPermission, calculatePermission } from "./model_acl.js";
import { currentPath, extractPath } from "./helper.js";

import { rm as rm$, mv as mv$ } from "./model_files.js";
import { rm as rmVL, mv as mvVL, withVirtualLayer } from "./model_virtual_layer.js";

const modalOpt = {
    withButtonsRight: t("OK"),
    withButtonsLeft: t("CANCEL"),
};

const rm = (...paths) => withVirtualLayer(
    rm$(...paths),
    rmVL(...paths),
);

const mv = (from, to) => withVirtualLayer(
    mv$(from, to),
    mvVL(from, to),
);

export default async function(render) {
    const $page = createElement(`
        <div class="component_submenu container">
            <div class="action left no-select"></div>
            <div class="action right no-select"></div>
        </div>
    `);
    render($page);
    onDestroy(() => clearSelection());

    const getSelectionLength$ = getSelection$().pipe(
        rxjs.map(() => lengthSelection()), // <- potentially expensive, hence the share
        rxjs.shareReplay(),
    );
    const $scroll = assert.type($page.closest(".scroll-y"), HTMLElement);
    componentLeft(createRender(qs($page, ".action.left")), { $scroll, getSelectionLength$ });
    componentRight(createRender(qs($page, ".action.right")), { getSelectionLength$ });

    effect(rxjs.fromEvent($scroll, "scroll", { passive: true }).pipe(
        rxjs.map((e) => e.target.scrollTop > 12),
        rxjs.distinctUntilChanged(),
        rxjs.startWith(false),
        rxjs.tap((scrolling) => scrolling
            ? $scroll.classList.add("scrolling")
            : $scroll.classList.remove("scrolling")),
    ));
}

function componentLeft(render, { $scroll, getSelectionLength$ }) {
    effect(getSelectionLength$.pipe(
        rxjs.filter((l) => l === 0),
        rxjs.mergeMap(() => getPermission()),
        rxjs.map(() => render(createFragment(`
            <button data-action="new-file" title="${t("New File")}"${toggleDependingOnPermission(currentPath(), "new-file")}>
                ${window.innerWidth < 410 && t("New File").length > 10
        ? t("New File", null, "NEW_FILE::SHORT")
        : t("New File")}
            </button>
            <button data-action="new-folder" title="${t("New Folder")}"${toggleDependingOnPermission(currentPath(), "new-folder")}>
                ${window.innerWidth < 410 && t("New Folder").length > 10
        ? t("New Folder", null, "NEW_FOLDER::SHORT")
        : t("New Folder")}
            </button>
        `))),
        rxjs.mergeMap(($page) => rxjs.merge(
            onClick(qs($page, `[data-action="new-file"]`)).pipe(rxjs.mapTo("NEW_FILE")),
            onClick(qs($page, `[data-action="new-folder"]`)).pipe(rxjs.mapTo("NEW_FOLDER")),
        )),
        rxjs.mergeMap((actionName) => getAction$().pipe(
            rxjs.first(),
            rxjs.map((currentAction) => actionName === currentAction ? null : actionName),
        )),
        rxjs.tap((actionName) => {
            $scroll.scrollTo({
                top: 0,
                behavior: window.chrome ? "smooth" : "instant", // prevent firefox bug
            });
            setAction(actionName);
        }),
    ));
    onDestroy(() => setAction(null));

    effect(getSelectionLength$.pipe(
        rxjs.filter((l) => l === 1),
        rxjs.map(() => render(createFragment(`
            <a target="_blank" ${generateLinkAttributes(expandSelection())}><button data-action="download" title="${t("Download")}">
                ${t("Download")}
            </button></a>
            <button data-action="delete"${toggleDependingOnPermission(currentPath(), "delete")} title="${t("Remove")}">
                ${t("Remove")}
            </button>
            <button data-action="rename" title="${t("Rename")}"${toggleDependingOnPermission(currentPath(), "rename")}>
                ${t("Rename")}
            </button>
            <button data-action="share" title="${t("Share")}" class="${(getConfig("enable_share") && !new URLSearchParams(location.search).has("share")) ? "" : "hidden"}">
                ${t("Share")}
            </button>
            <button data-action="tag" title="${t("Tag")}" class="${new URLSearchParams(location.search).get("canary") === "true" ? "" : "hidden"}">
                ${t("Tag")}
            </button>
        `))),
        rxjs.tap(($buttons) => animate($buttons, { time: 100, keyframes: slideYIn(5) })),
        rxjs.switchMap(($page) => rxjs.merge(
            onClick(qs($page, `[data-action="download"]`), { preventDefault: true }).pipe(rxjs.tap(($button) => {
                let url = $button.parentElement.getAttribute("href");
                url += "&name=" + $button.parentElement.getAttribute("download");
                window.open(url);
            })),
            onClick(qs($page, `[data-action="share"]`)).pipe(rxjs.tap(() => {
                componentShare(createModal({
                    withButtonsRight: null,
                    withButtonsLeft: null,
                    targetHeight: 315,
                }), { path: expandSelection()[0].path });
            })),
            onClick(qs($page, `[data-action="tag"]`)).pipe(rxjs.tap(() => {
                componentTag(createModal({
                    ...modalOpt,
                    withButtonsLeft: null,
                    withButtonsRight: null,
                }), { path: expandSelection()[0].path });
            })),
            onClick(qs($page, `[data-action="rename"]`)).pipe(rxjs.mergeMap(() => {
                const path = expandSelection()[0].path;
                return rxjs.from(componentRename(
                    createModal(modalOpt),
                    basename(path.replace(new RegExp("/$"), "")),
                )).pipe(rxjs.mergeMap((val) => {
                    const [basepath] = extractPath(path);
                    clearSelection();
                    clearCache(path);
                    clearCache(basepath + val);
                    return mv(path, basepath + val);
                }));
            })),
            onClick(qs($page, `[data-action="delete"]`)).pipe(rxjs.mergeMap(() => {
                const path = expandSelection()[0].path;
                return rxjs.from(componentDelete(
                    createModal(modalOpt),
                    basename(path.replace(new RegExp("/$"), "")).substr(0, 15),
                )).pipe(rxjs.mergeMap(() => {
                    const selection = expandSelection()[0].path;
                    clearSelection();
                    clearCache(path);
                    return rm(selection);
                }));
            })),
        )),
    ));

    effect(getSelectionLength$.pipe(
        rxjs.filter((l) => l > 1),
        rxjs.map(() => render(createFragment(`
            <a target="_blank" ${generateLinkAttributes(expandSelection())}><button data-action="download">
                ${t("Download")}
            </button></a>
            <button data-action="delete"${toggleDependingOnPermission(currentPath(), "delete")}>
                ${t("Remove")}
            </button>
        `))),
        rxjs.mergeMap(($page) => rxjs.merge(
            onClick(qs($page, `[data-action="download"]`), { preventDefault: true }).pipe(rxjs.tap(($button) => {
                window.open($button.parentElement.getAttribute("href"));
            })),
            onClick(qs($page, `[data-action="delete"]`)).pipe(rxjs.mergeMap(() => {
                const paths = expandSelection().map(({ path }) => path);
                return rxjs.from(componentDelete(
                    createModal(modalOpt),
                    "remove",
                )).pipe(rxjs.mergeMap(() => {
                    clearSelection();
                    return rm(...paths);
                }));
            })),
        )),
    ));
}

function componentRight(render, { getSelectionLength$ }) {
    const ICONS = {
        LIST_VIEW: "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8cGF0aCBzdHlsZT0iZmlsbDojNjI2NDY5O2ZpbGwtb3BhY2l0eToxIiBkPSJtIDEzMy4zMzMsNTYgdiA2NCBjIDAsMTMuMjU1IC0xMC43NDUsMjQgLTI0LDI0IEggMjQgQyAxMC43NDUsMTQ0IDAsMTMzLjI1NSAwLDEyMCBWIDU2IEMgMCw0Mi43NDUgMTAuNzQ1LDMyIDI0LDMyIGggODUuMzMzIGMgMTMuMjU1LDAgMjQsMTAuNzQ1IDI0LDI0IHogbSAzNzkuMzM0LDIzMiB2IC02NCBjIDAsLTEzLjI1NSAtMTAuNzQ1LC0yNCAtMjQsLTI0IEggMjEzLjMzMyBjIC0xMy4yNTUsMCAtMjQsMTAuNzQ1IC0yNCwyNCB2IDY0IGMgMCwxMy4yNTUgMTAuNzQ1LDI0IDI0LDI0IGggMjc1LjMzMyBjIDEzLjI1NiwwIDI0LjAwMSwtMTAuNzQ1IDI0LjAwMSwtMjQgeiBtIDAsLTE2OCBWIDU2IGMgMCwtMTMuMjU1IC0xMC43NDUsLTI0IC0yNCwtMjQgSCAyMTMuMzMzIGMgLTEzLjI1NSwwIC0yNCwxMC43NDUgLTI0LDI0IHYgNjQgYyAwLDEzLjI1NSAxMC43NDUsMjQgMjQsMjQgaCAyNzUuMzMzIGMgMTMuMjU2LDAgMjQuMDAxLC0xMC43NDUgMjQuMDAxLC0yNCB6IE0gMTA5LjMzMywyMDAgSCAyNCBDIDEwLjc0NSwyMDAgMCwyMTAuNzQ1IDAsMjI0IHYgNjQgYyAwLDEzLjI1NSAxMC43NDUsMjQgMjQsMjQgaCA4NS4zMzMgYyAxMy4yNTUsMCAyNCwtMTAuNzQ1IDI0LC0yNCB2IC02NCBjIDAsLTEzLjI1NSAtMTAuNzQ1LC0yNCAtMjQsLTI0IHogTSAwLDM5MiB2IDY0IGMgMCwxMy4yNTUgMTAuNzQ1LDI0IDI0LDI0IGggODUuMzMzIGMgMTMuMjU1LDAgMjQsLTEwLjc0NSAyNCwtMjQgdiAtNjQgYyAwLC0xMy4yNTUgLTEwLjc0NSwtMjQgLTI0LC0yNCBIIDI0IEMgMTAuNzQ1LDM2OCAwLDM3OC43NDUgMCwzOTIgWiBtIDE4OS4zMzMsMCB2IDY0IGMgMCwxMy4yNTUgMTAuNzQ1LDI0IDI0LDI0IGggMjc1LjMzMyBjIDEzLjI1NSwwIDI0LC0xMC43NDUgMjQsLTI0IHYgLTY0IGMgMCwtMTMuMjU1IC0xMC43NDUsLTI0IC0yNCwtMjQgSCAyMTMuMzMzIGMgLTEzLjI1NSwwIC0yNCwxMC43NDUgLTI0LDI0IHoiIC8+Cjwvc3ZnPgo=",
        GRID_VIEW: "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgNDQgNDQiPgogIDxwYXRoIGZpbGw9IiM2MjY0NjkiIGQ9Ik0gMTgsNCBIIDYgQyA0LjksNCA0LDQuOSA0LDYgdiAxMiBjIDAsMS4xIDAuOSwyIDIsMiBoIDEyIGMgMS4xLDAgMiwtMC45IDIsLTIgViA2IEMgMjAsNC45IDE5LjEsNCAxOCw0IFoiIC8+CiAgPHBhdGggZmlsbD0iIzYyNjQ2OSIgZD0iTSAzOCw0IEggMjYgYyAtMS4xLDAgLTIsMC45IC0yLDIgdiAxMiBjIDAsMS4xIDAuOSwyIDIsMiBoIDEyIGMgMS4xLDAgMiwtMC45IDIsLTIgViA2IEMgNDAsNC45IDM5LjEsNCAzOCw0IFoiIC8+CiAgPHBhdGggZmlsbD0iIzYyNjQ2OSIgZD0iTSAxOCwyNCBIIDYgYyAtMS4xLDAgLTIsMC45IC0yLDIgdiAxMiBjIDAsMS4xIDAuOSwyIDIsMiBoIDEyIGMgMS4xLDAgMiwtMC45IDIsLTIgViAyNiBjIDAsLTEuMSAtMC45LC0yIC0yLC0yIHoiIC8+CiAgPHBhdGggZmlsbD0iIzYyNjQ2OSIgZD0iTSAzOCwyNCBIIDI2IGMgLTEuMSwwIC0yLDAuOSAtMiwyIHYgMTIgYyAwLDEuMSAwLjksMiAyLDIgaCAxMiBjIDEuMSwwIDIsLTAuOSAyLC0yIFYgMjYgYyAwLC0xLjEgLTAuOSwtMiAtMiwtMiB6IiAvPgo8L3N2Zz4K",

        CROSS: "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MS45NzYgNTEuOTc2Ij4KICA8cGF0aCBzdHlsZT0iZmlsbDojMDAwMDAwO2ZpbGwtb3BhY2l0eTowLjUzMzMzMjg1O3N0cm9rZS13aWR0aDoxLjQ1NjgxMTE5IiBkPSJtIDQxLjAwNTMxLDQwLjg0NDA2MiBjIC0xLjEzNzc2OCwxLjEzNzc2NSAtMi45ODIwODgsMS4xMzc3NjUgLTQuMTE5ODYxLDAgTCAyNi4wNjg2MjgsMzAuMDI3MjM0IDE0LjczNzU1MSw0MS4zNTgzMSBjIC0xLjEzNzc3MSwxLjEzNzc3MSAtMi45ODIwOTMsMS4xMzc3NzEgLTQuMTE5ODYxLDAgLTEuMTM3NzcyMiwtMS4xMzc3NjggLTEuMTM3NzcyMiwtMi45ODIwODggMCwtNC4xMTk4NjEgTCAyMS45NDg3NjYsMjUuOTA3MzcyIDExLjEzMTkzOCwxNS4wOTA1NTEgYyAtMS4xMzc3NjQ3LC0xLjEzNzc3MSAtMS4xMzc3NjQ3LC0yLjk4MzU1MyAwLC00LjExOTg2MSAxLjEzNzc3NCwtMS4xMzc3NzIxIDIuOTgyMDk4LC0xLjEzNzc3MjEgNC4xMTk4NjUsMCBMIDI2LjA2ODYyOCwyMS43ODc1MTIgMzYuMzY5NzM5LDExLjQ4NjM5OSBjIDEuMTM3NzY4LC0xLjEzNzc2OCAyLjk4MjA5MywtMS4xMzc3NjggNC4xMTk4NjIsMCAxLjEzNzc2NywxLjEzNzc2OSAxLjEzNzc2NywyLjk4MjA5NCAwLDQuMTE5ODYyIEwgMzAuMTg4NDg5LDI1LjkwNzM3MiA0MS4wMDUzMSwzNi43MjQxOTcgYyAxLjEzNzc3MSwxLjEzNzc2NyAxLjEzNzc3MSwyLjk4MjA5MSAwLDQuMTE5ODY1IHoiIC8+Cjwvc3ZnPgo=",
        MAGNIFYING_GLASS: "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8cGF0aCBzdHlsZT0iZmlsbDojNjI2NDY5O2ZpbGwtb3BhY2l0eToxIiBkPSJNNTA1IDQ0Mi43TDQwNS4zIDM0M2MtNC41LTQuNS0xMC42LTctMTctN0gzNzJjMjcuNi0zNS4zIDQ0LTc5LjcgNDQtMTI4QzQxNiA5My4xIDMyMi45IDAgMjA4IDBTMCA5My4xIDAgMjA4czkzLjEgMjA4IDIwOCAyMDhjNDguMyAwIDkyLjctMTYuNCAxMjgtNDR2MTYuM2MwIDYuNCAyLjUgMTIuNSA3IDE3bDk5LjcgOTkuN2M5LjQgOS40IDI0LjYgOS40IDMzLjkgMGwyOC4zLTI4LjNjOS40LTkuNCA5LjQtMjQuNi4xLTM0ek0yMDggMzM2Yy03MC43IDAtMTI4LTU3LjItMTI4LTEyOCAwLTcwLjcgNTcuMi0xMjggMTI4LTEyOCA3MC43IDAgMTI4IDU3LjIgMTI4IDEyOCAwIDcwLjctNTcuMiAxMjgtMTI4IDEyOHoiIC8+Cjwvc3ZnPgo=",

        SORT: "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgNTEyIj4KICA8cGF0aCBzdHlsZT0iZmlsbDojNjI2NDY5O2ZpbGwtb3BhY2l0eToxIiBkPSJNNDEgMjg4aDIzOGMyMS40IDAgMzIuMSAyNS45IDE3IDQxTDE3NyA0NDhjLTkuNCA5LjQtMjQuNiA5LjQtMzMuOSAwTDI0IDMyOWMtMTUuMS0xNS4xLTQuNC00MSAxNy00MXptMjU1LTEwNUwxNzcgNjRjLTkuNC05LjQtMjQuNi05LjQtMzMuOSAwTDI0IDE4M2MtMTUuMSAxNS4xLTQuNCA0MSAxNyA0MWgyMzhjMjEuNCAwIDMyLjEtMjUuOSAxNy00MXoiIC8+Cjwvc3ZnPgo=",
        CHECK: "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8cGF0aCBzdHlsZT0iZmlsbDojOTA5MDkwO2ZpbGwtb3BhY2l0eToxIiBkPSJNMTczLjg5OCA0MzkuNDA0bC0xNjYuNC0xNjYuNGMtOS45OTctOS45OTctOS45OTctMjYuMjA2IDAtMzYuMjA0bDM2LjIwMy0zNi4yMDRjOS45OTctOS45OTggMjYuMjA3LTkuOTk4IDM2LjIwNCAwTDE5MiAzMTIuNjkgNDMyLjA5NSA3Mi41OTZjOS45OTctOS45OTcgMjYuMjA3LTkuOTk3IDM2LjIwNCAwbDM2LjIwMyAzNi4yMDRjOS45OTcgOS45OTcgOS45OTcgMjYuMjA2IDAgMzYuMjA0bC0yOTQuNCAyOTQuNDAxYy05Ljk5OCA5Ljk5Ny0yNi4yMDcgOS45OTctMzYuMjA0LS4wMDF6IiAvPgo8L3N2Zz4K",
    };

    const escape$ = rxjs.fromEvent(window, "keydown").pipe(
        rxjs.filter((event) => event.keyCode === 27),
        rxjs.share(),
    );

    const defaultLayout = (view) => {
        switch (view) {
        case "grid": return `<img class="component_icon" draggable="false" src="data:image/svg+xml;base64,${ICONS.LIST_VIEW}" alt="grid" />`;
        case "list": return `<img class="component_icon" draggable="false" src="data:image/svg+xml;base64,${ICONS.GRID_VIEW}" alt="list" />`;
        default: throw new Error("NOT_IMPLEMENTED");
        }
    };
    const defaultSort = (sort) => { // TODO
        return `<img class="component_icon" draggable="false" src="data:image/svg+xml;base64,${ICONS.SORT}" alt="${sort}" />`;
    };
    effect(getSelectionLength$.pipe(
        rxjs.filter((l) => l === 0),
        rxjs.mergeMap(() => getState$().pipe(rxjs.first())),
        rxjs.map(({ view, sort }) => render(createFragment(`
            <form style="display: inline-block;" onsubmit="event.preventDefault()">
                <input class="hidden" placeholder="${t("search")}" name="q" style="
                    background: transparent;
                    border: none;
                    padding-left: 5px;
                    color: var(--color);
                    font-size: 0.95rem;">
            </form>
            <button data-action="search" title="${t("Search")}">
                <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,${ICONS.MAGNIFYING_GLASS}" alt="search" />
            </button>
            <button data-action="view" title="${t("Layout")}">
                ${defaultLayout(view)}
            </button>
            <button data-action="sort" title="${t("Sort")}">
                ${defaultSort(sort)}
            </button>
            <div class="component_dropdown view sort" data-target="sort">
                <div class="dropdown_container">
                    <ul>
                        <li data-target="type">
                            ${t("Sort By Type")}
                            <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,${ICONS.CHECK}" alt="check" />
                        </li>
                        <li data-target="date">
                            ${t("Sort By Date")}
                        </li>
                        <li data-target="name">
                            ${t("Sort By Name")}
                        </li>
                        <li data-target="size">
                            ${t("Sort By Size")}
                        </li>
                    </ul>
                </div>
            </div>
        `))),
        rxjs.mergeMap(($page) => rxjs.merge(
            // feature: view button
            onClick(qs($page, `[data-action="view"]`)).pipe(rxjs.tap(($button) => {
                const $img = $button.querySelector("img");
                if ($img.getAttribute("alt") === "list") {
                    setState("view", "grid");
                    $img.setAttribute("alt", "grid");
                    $img.setAttribute("src", "data:image/svg+xml;base64," + ICONS.LIST_VIEW);
                } else {
                    setState("view", "list");
                    $img.setAttribute("alt", "list");
                    $img.setAttribute("src", "data:image/svg+xml;base64," + ICONS.GRID_VIEW);
                }
            })),
            // feature: sort button
            rxjs.merge(
                onClick(qs($page, `[data-action="sort"]`)).pipe(rxjs.map(($el) => { // toggle the dropdown
                    return !$el.nextSibling.classList.contains("active");
                })),
                escape$.pipe(rxjs.mapTo(false)), // quit the dropdown on esc
                rxjs.fromEvent(window, "click").pipe( // quit when clicking outside the dropdown
                    rxjs.filter((e) => !e.target.closest(`[data-action="sort"]`) && !e.target.closest(".dropdown_container")),
                    rxjs.mapTo(false),
                ),
            ).pipe(
                rxjs.takeUntil(getSelection$().pipe(rxjs.skip(1))),
                rxjs.mergeMap((targetStateIsOpen) => {
                    const $sort = qs($page, `[data-target="sort"]`);
                    const $lis = qsa($page, `.dropdown_container li`);
                    targetStateIsOpen
                        ? $sort.classList.add("active")
                        : $sort.classList.remove("active");

                    return onClick($lis).pipe(
                        rxjs.first(),
                        rxjs.mergeMap(($el) => getState$().pipe(rxjs.first(), rxjs.map((state) => ({
                            order: state.order,
                            $el,
                        })))),
                        rxjs.tap(({ $el, order }) => {
                            setState(
                                "sort", $el.getAttribute("data-target"),
                                "order", order === "asc" ? "des" : "asc",
                            );
                            [...$lis].forEach(($li) => {
                                const $img = $li.querySelector("img");
                                if ($img) $img.remove();
                            });
                            $el.appendChild(createElement(`<img class="component_icon" src="data:image/svg+xml;base64,${ICONS.CHECK}" alt="check" />`));
                            $sort.classList.remove("active");
                        }),
                    );
                }),
            ),
            // feature: search box
            rxjs.merge(
                rxjs.merge(
                    onClick(qs($page, `[data-action="search"]`)),
                    rxjs.fromEvent(window, "keydown").pipe(
                        rxjs.filter((e) => (e.ctrlKey || e.metaKey) && e.key === "f"),
                        preventDefault(),
                    ),
                ).pipe(rxjs.map(() => qs($page, "input").classList.contains("hidden"))),
                escape$.pipe(rxjs.mapTo(false)),
            ).pipe(
                rxjs.takeUntil(getSelection$().pipe(rxjs.skip(1))),
                rxjs.mergeMap(async(show) => {
                    const $input = qs($page, "input");
                    const $searchImg = qs($page, "img");
                    if (show) {
                        $page.classList.add("hover");
                        $input.value = "";
                        $input.classList.remove("hidden");
                        $searchImg.setAttribute("src", "data:image/svg+xml;base64," + ICONS.CROSS);
                        $searchImg.setAttribute("alt", "close");

                        const $listOfButtons = $page.parentElement.firstElementChild.children;
                        for (const $item of $listOfButtons) {
                            $item.classList.add("hidden");
                        }
                        setAction(null); // reset new file, new folder
                        await animate($input, {
                            keyframes: [{ width: "0px" }, { width: "180px" }],
                            time: 200,
                        });
                        $input.focus();
                    } else {
                        $page.classList.remove("hover");
                        $searchImg.setAttribute("src", "data:image/svg+xml;base64," + ICONS.MAGNIFYING_GLASS);
                        $searchImg.setAttribute("alt", "search");
                        await animate($input, {
                            keyframes: [{ width: "180px" }, { width: "0px" }],
                            time: 100,
                        });
                        $input.classList.add("hidden");
                        const $listOfButtons = $page.parentElement.firstElementChild.children;
                        for (const $item of $listOfButtons) {
                            $item.classList.remove("hidden");
                            animate($item, { time: 100, keyframes: slideXIn(5) });
                        }
                        setState("search", "");
                    }
                    return $input;
                }),
                rxjs.mergeMap(($input) => rxjs.merge(
                    rxjs.fromEvent($input, "input").pipe(
                        rxjs.debounce(() => $input.value ? rxjs.timer(500) : rxjs.of(null)),
                    ),
                    rxjs.fromEvent($input, "change"),
                ).pipe(
                    rxjs.map(() => $input.value),
                    rxjs.distinctUntilChanged(),
                    rxjs.tap((val) => setState("search", val)),
                )),
            ),
        )),
    ));
    onDestroy(() => setState("search", ""));

    effect(getSelectionLength$.pipe(
        rxjs.filter((l) => l >= 1),
        rxjs.map((size) => render(createFragment(`
            <button data-bind="clear">
                ${size} <component-icon name="close"></component-icon>
            </button>
        `))),
        rxjs.mergeMap(($page) => onClick(qs($page, `[data-bind="clear"]`)).pipe(
            rxjs.tap(() => clearSelection()),
            rxjs.takeUntil(getSelection$().pipe(rxjs.skip(1))),
        )),
    ));
}

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "../../css/designsystem_dropdown.css"),
        loadCSS(import.meta.url, "./ctrl_submenu.css"),
        loadCSS(import.meta.url, "./modal_share.css"),
        loadCSS(import.meta.url, "./modal_tag.css"),
    ]);
}

function generateLinkAttributes(selections) {
    let filename = "archive.zip";
    let href = "api/files/zip?";
    if (selections.length === 1) {
        const path = selections[0].path;
        const regDir = new RegExp("/$");
        const isDir = regDir.test(path);
        if (isDir) {
            filename = basename(path.replace(regDir, "")) + ".zip";
        } else {
            filename = basename(path);
            href = "api/files/cat?";
        }
    }
    href += selections.map(({ path }) => "path=" + encodeURIComponent(path)).join("&");
    href = forwardURLParams(href, ["share"]);
    return `href="${href}" download="${filename}"`;
}

function toggleDependingOnPermission(path, action) {
    return calculatePermission(path, action) === false ? ` style="display:none"` : "";
}
