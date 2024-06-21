import { createElement, createRender } from "../lib/skeleton/index.js";
import { navigate, fromHref } from "../lib/skeleton/router.js";
import rxjs, { effect, preventDefault } from "../lib/rx.js";
import { onDestroy } from "../lib/skeleton/lifecycle.js";
import { animate, slideYOut } from "../lib/animate.js";
import { qs } from "../lib/dom.js";
import { loadCSS } from "../helpers/loader.js";
import { init as initBreadcrumb } from "../components/breadcrumb.js";
import t from "../locales/index.js";

export default function(ctrl) {
    const urlToPath = (pathname = "") => decodeURIComponent(pathname.split("/").filter((chunk, i) => i !== 1).join("/"));
    const $page = createElement(`
        <div class="component_filemanager_shell" style="flex-direction:row">
            <div data-bind="sidebar" class="hidden"></div>
            <div style="width:100%;display: flex; flex-direction: column;">
                <div is="component-breadcrumb" path="${urlToPath(history.state.previous)}"></div>
                <div data-bind="filemanager-children"></div>
            </div>
        </div>
    `);

    return async function(render) {
        render($page);

        // feature1: setup the breadcrumb path
        const $breadcrumb = qs($page, `[is="component-breadcrumb"]`);
        $breadcrumb.setAttribute("path", urlToPath(fromHref(location.pathname + location.hash)));

        // feature2: setup the childrens
        const $main = qs($page, `[data-bind="filemanager-children"]`);
        $main.classList.remove("hidden");
        ctrl(createRender($main));
        ctrlSidebar(createRender(qs($page, `[data-bind="sidebar"]`)));
        onDestroy(async() => {
            if ((history.state.previous || "").startsWith("/view/") && location.pathname.startsWith("/files/")) {
                await animate($main, { time: 100, keyframes: slideYOut(20), fill: "none" });
                $main.classList.add("hidden");
            }
        });

        // feature3: trigger the sidebar
        effect(rxjs.merge(
            rxjs.fromEvent(window, "resize"),
            rxjs.of(null),
        ).pipe(
            rxjs.mapTo($page.firstElementChild),
            rxjs.tap(($sidebar) => document.body.clientWidth > 1250 ? $sidebar.classList.remove("hidden") : $sidebar.classList.add("hidden")),
        ));

        // feature4: key shortcut
        effect(rxjs.fromEvent(window, "keydown").pipe(
            rxjs.filter((e) => new RegExp("^/files/.+").test(location.pathname) && e.keyCode === 8 && document.activeElement.nodeName !== "INPUT"), // backspace in filemanager
            rxjs.tap(() => {
                const p = location.pathname.replace(new RegExp("/$"), "").split("/");
                p.pop();
                navigate(p.join("/") + "/" + location.hash);
            }),
        ));
    };
}

async function ctrlSidebar(render) {
    // Quick Access:
    // - home folders
    // - indexedDB folders
    // Shared Drive:
    // - shared links (rwd)
    // Tags:
    // - name + color
    const $comp = createElement(`
        <div class="component_sidebar" style="display:none">
            <br>

            <h3>${t("Quick Access")}</h3>
            <div>
                <a href="/files/Documents/">
                    <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiPgogIDxnIHRyYW5zZm9ybT0ibWF0cml4KDAuODY2NjY0MzEsMCwwLDAuODY2NjcsLTE3Mi4wNDU3OCwtODY0LjMyNzU5KSIgc3R5bGU9ImZpbGw6Izc1YmJkOTtmaWxsLW9wYWNpdHk6MC45NDExNzY0NztmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojNzViYmQ5O2ZpbGwtb3BhY2l0eTowLjk0MTE3NjQ3O2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KICA8ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjg2NjY3LDAsMCwwLjg2NjY3LC0xNzIuMDQ2OTIsLTg2NC43ODM0KSIgc3R5bGU9ImZpbGw6IzlhZDFlZDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojOWFkMWVkO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KPC9zdmc+Cg==" alt="directory">
                    <div>Documents</div>
                </a>
                <a href="/files/Documents/">
                    <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiPgogIDxnIHRyYW5zZm9ybT0ibWF0cml4KDAuODY2NjY0MzEsMCwwLDAuODY2NjcsLTE3Mi4wNDU3OCwtODY0LjMyNzU5KSIgc3R5bGU9ImZpbGw6Izc1YmJkOTtmaWxsLW9wYWNpdHk6MC45NDExNzY0NztmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojNzViYmQ5O2ZpbGwtb3BhY2l0eTowLjk0MTE3NjQ3O2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KICA8ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjg2NjY3LDAsMCwwLjg2NjY3LC0xNzIuMDQ2OTIsLTg2NC43ODM0KSIgc3R5bGU9ImZpbGw6IzlhZDFlZDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojOWFkMWVkO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KPC9zdmc+Cg==" alt="directory">
                    <div>Documents</div>
                </a>
                <a href="/files/Documents/">
                    <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiPgogIDxnIHRyYW5zZm9ybT0ibWF0cml4KDAuODY2NjY0MzEsMCwwLDAuODY2NjcsLTE3Mi4wNDU3OCwtODY0LjMyNzU5KSIgc3R5bGU9ImZpbGw6Izc1YmJkOTtmaWxsLW9wYWNpdHk6MC45NDExNzY0NztmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojNzViYmQ5O2ZpbGwtb3BhY2l0eTowLjk0MTE3NjQ3O2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KICA8ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjg2NjY3LDAsMCwwLjg2NjY3LC0xNzIuMDQ2OTIsLTg2NC43ODM0KSIgc3R5bGU9ImZpbGw6IzlhZDFlZDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojOWFkMWVkO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KPC9zdmc+Cg==" alt="directory">
                    <div>Documents</div>
                </a>
                <a href="/files/Documents/">
                    <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiPgogIDxnIHRyYW5zZm9ybT0ibWF0cml4KDAuODY2NjY0MzEsMCwwLDAuODY2NjcsLTE3Mi4wNDU3OCwtODY0LjMyNzU5KSIgc3R5bGU9ImZpbGw6Izc1YmJkOTtmaWxsLW9wYWNpdHk6MC45NDExNzY0NztmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojNzViYmQ5O2ZpbGwtb3BhY2l0eTowLjk0MTE3NjQ3O2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KICA8ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjg2NjY3LDAsMCwwLjg2NjY3LC0xNzIuMDQ2OTIsLTg2NC43ODM0KSIgc3R5bGU9ImZpbGw6IzlhZDFlZDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojOWFkMWVkO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KPC9zdmc+Cg==" alt="directory">
                    <div>Documents</div>
                </a>
                <a href="/files/Documents/">
                    <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiPgogIDxnIHRyYW5zZm9ybT0ibWF0cml4KDAuODY2NjY0MzEsMCwwLDAuODY2NjcsLTE3Mi4wNDU3OCwtODY0LjMyNzU5KSIgc3R5bGU9ImZpbGw6Izc1YmJkOTtmaWxsLW9wYWNpdHk6MC45NDExNzY0NztmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojNzViYmQ5O2ZpbGwtb3BhY2l0eTowLjk0MTE3NjQ3O2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KICA8ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjg2NjY3LDAsMCwwLjg2NjY3LC0xNzIuMDQ2OTIsLTg2NC43ODM0KSIgc3R5bGU9ImZpbGw6IzlhZDFlZDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojOWFkMWVkO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KPC9zdmc+Cg==" alt="directory">
                    <div>Documents</div>
                </a>
                <a href="/files/Documents/">
                    <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiPgogIDxnIHRyYW5zZm9ybT0ibWF0cml4KDAuODY2NjY0MzEsMCwwLDAuODY2NjcsLTE3Mi4wNDU3OCwtODY0LjMyNzU5KSIgc3R5bGU9ImZpbGw6Izc1YmJkOTtmaWxsLW9wYWNpdHk6MC45NDExNzY0NztmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojNzViYmQ5O2ZpbGwtb3BhY2l0eTowLjk0MTE3NjQ3O2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KICA8ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjg2NjY3LDAsMCwwLjg2NjY3LC0xNzIuMDQ2OTIsLTg2NC43ODM0KSIgc3R5bGU9ImZpbGw6IzlhZDFlZDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojOWFkMWVkO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KPC9zdmc+Cg==" alt="directory">
                    <div>Documents</div>
                </a>
            </div>

            <h3>${t("Shared Drive")}</h3>
            <div></div>

            <h3>${t("Tags")}</h3>
            <div></div>
        </div>
    `);
    render($comp);
}

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "../components/decorator_shell_filemanager.css"),
        initBreadcrumb(),
    ]);
}
