import { onDestroy, createElement, createRender, createFragment } from "../../lib/skeleton/index.js";
import rxjs, { effect, applyMutation, onClick } from "../../lib/rx.js";
import { animate } from "../../lib/animate.js";
import { qs } from "../../lib/dom.js";
import { getSelection$, clearSelection } from "./model_files.js";

export default async function(render) {
    const $page = createElement(`<div class="component_submenu container"></div>`);
    render($page);

    const $scroll = $page.closest(".scroll-y")
    effect(rxjs.fromEvent($scroll, "scroll", { passive: true }).pipe(
        rxjs.map((e) => e.target.scrollTop > 30),
        rxjs.distinctUntilChanged(),
        rxjs.tap((scrolling) => scrolling ?
                 $scroll.classList.add("scrolling") :
                 $scroll.classList.remove("scrolling")),
    ));

    onDestroy(() => clearSelection());
    effect(getSelection$().pipe(
        rxjs.filter((selections) => selections.length === 0),
        rxjs.mapTo(createFragment(`
            <div class="action left no-select" style="margin-left:2px;">
                <button>New File</button>
                <button>New Folder</button>
            </div>
            <div class="action right no-select" style="margin-right:2px;">
                <button>
                   <input style="
                     display: none;
                     background: transparent;
                     border: none;
                     border-bottom: 2px solid #e2e2e2;
                     margin-right: 10px;
                     color: var(--color);
                     font-size: 0.8rem;
                    ">
                    <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8cGF0aCBzdHlsZT0iZmlsbDojNjI2NDY5O2ZpbGwtb3BhY2l0eToxIiBkPSJNNTA1IDQ0Mi43TDQwNS4zIDM0M2MtNC41LTQuNS0xMC42LTctMTctN0gzNzJjMjcuNi0zNS4zIDQ0LTc5LjcgNDQtMTI4QzQxNiA5My4xIDMyMi45IDAgMjA4IDBTMCA5My4xIDAgMjA4czkzLjEgMjA4IDIwOCAyMDhjNDguMyAwIDkyLjctMTYuNCAxMjgtNDR2MTYuM2MwIDYuNCAyLjUgMTIuNSA3IDE3bDk5LjcgOTkuN2M5LjQgOS40IDI0LjYgOS40IDMzLjkgMGwyOC4zLTI4LjNjOS40LTkuNCA5LjQtMjQuNi4xLTM0ek0yMDggMzM2Yy03MC43IDAtMTI4LTU3LjItMTI4LTEyOCAwLTcwLjcgNTcuMi0xMjggMTI4LTEyOCA3MC43IDAgMTI4IDU3LjIgMTI4IDEyOCAwIDcwLjctNTcuMiAxMjgtMTI4IDEyOHoiIC8+Cjwvc3ZnPgo=" alt="search_dark" />
                </button>
                <button>
                    <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8cGF0aCBzdHlsZT0iZmlsbDojNjI2NDY5O2ZpbGwtb3BhY2l0eToxIiBkPSJtIDEzMy4zMzMsNTYgdiA2NCBjIDAsMTMuMjU1IC0xMC43NDUsMjQgLTI0LDI0IEggMjQgQyAxMC43NDUsMTQ0IDAsMTMzLjI1NSAwLDEyMCBWIDU2IEMgMCw0Mi43NDUgMTAuNzQ1LDMyIDI0LDMyIGggODUuMzMzIGMgMTMuMjU1LDAgMjQsMTAuNzQ1IDI0LDI0IHogbSAzNzkuMzM0LDIzMiB2IC02NCBjIDAsLTEzLjI1NSAtMTAuNzQ1LC0yNCAtMjQsLTI0IEggMjEzLjMzMyBjIC0xMy4yNTUsMCAtMjQsMTAuNzQ1IC0yNCwyNCB2IDY0IGMgMCwxMy4yNTUgMTAuNzQ1LDI0IDI0LDI0IGggMjc1LjMzMyBjIDEzLjI1NiwwIDI0LjAwMSwtMTAuNzQ1IDI0LjAwMSwtMjQgeiBtIDAsLTE2OCBWIDU2IGMgMCwtMTMuMjU1IC0xMC43NDUsLTI0IC0yNCwtMjQgSCAyMTMuMzMzIGMgLTEzLjI1NSwwIC0yNCwxMC43NDUgLTI0LDI0IHYgNjQgYyAwLDEzLjI1NSAxMC43NDUsMjQgMjQsMjQgaCAyNzUuMzMzIGMgMTMuMjU2LDAgMjQuMDAxLC0xMC43NDUgMjQuMDAxLC0yNCB6IE0gMTA5LjMzMywyMDAgSCAyNCBDIDEwLjc0NSwyMDAgMCwyMTAuNzQ1IDAsMjI0IHYgNjQgYyAwLDEzLjI1NSAxMC43NDUsMjQgMjQsMjQgaCA4NS4zMzMgYyAxMy4yNTUsMCAyNCwtMTAuNzQ1IDI0LC0yNCB2IC02NCBjIDAsLTEzLjI1NSAtMTAuNzQ1LC0yNCAtMjQsLTI0IHogTSAwLDM5MiB2IDY0IGMgMCwxMy4yNTUgMTAuNzQ1LDI0IDI0LDI0IGggODUuMzMzIGMgMTMuMjU1LDAgMjQsLTEwLjc0NSAyNCwtMjQgdiAtNjQgYyAwLC0xMy4yNTUgLTEwLjc0NSwtMjQgLTI0LC0yNCBIIDI0IEMgMTAuNzQ1LDM2OCAwLDM3OC43NDUgMCwzOTIgWiBtIDE4OS4zMzMsMCB2IDY0IGMgMCwxMy4yNTUgMTAuNzQ1LDI0IDI0LDI0IGggMjc1LjMzMyBjIDEzLjI1NSwwIDI0LC0xMC43NDUgMjQsLTI0IHYgLTY0IGMgMCwtMTMuMjU1IC0xMC43NDUsLTI0IC0yNCwtMjQgSCAyMTMuMzMzIGMgLTEzLjI1NSwwIC0yNCwxMC43NDUgLTI0LDI0IHoiIC8+Cjwvc3ZnPgo=" alt="list" />
                </button>
                <button>
                    <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgNTEyIj4KICA8cGF0aCBzdHlsZT0iZmlsbDojNjI2NDY5O2ZpbGwtb3BhY2l0eToxIiBkPSJNNDEgMjg4aDIzOGMyMS40IDAgMzIuMSAyNS45IDE3IDQxTDE3NyA0NDhjLTkuNCA5LjQtMjQuNiA5LjQtMzMuOSAwTDI0IDMyOWMtMTUuMS0xNS4xLTQuNC00MSAxNy00MXptMjU1LTEwNUwxNzcgNjRjLTkuNC05LjQtMjQuNi05LjQtMzMuOSAwTDI0IDE4M2MtMTUuMSAxNS4xLTQuNCA0MSAxNyA0MWgyMzhjMjEuNCAwIDMyLjEtMjUuOSAxNy00MXoiIC8+Cjwvc3ZnPgo=" alt="sort" />
                </button>
            </div>
        `)),
        applyMutation($page, "replaceChildren"),
    ));

    effect(getSelection$().pipe(
        rxjs.filter((selections) => selections.length > 0),
        rxjs.tap((selections) => selections.length === 1 && animate($page)),
        rxjs.map((selections) => createFragment(`
            <div class="action left">
                <button>Download</button>
                <button>Share</button>
                <button>Embed</button>
                <button>Tag</button>
                <button>Rename</button>
                <button>Delete</button>
            </div>
            <div class="action right">
                <button data-bind="clear">
                    ${selections.length} x
                </button>
            </div>
        `)),
        applyMutation($page, "replaceChildren"),
        rxjs.mergeMap((e) => rxjs.merge(
            onClick(qs($page, `[data-bind="clear"]`)).pipe(
                rxjs.tap(() => clearSelection()),
            ),
        )),
    ));
}
