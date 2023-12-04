import { createElement, createRender } from "../../lib/skeleton/index.js";
import { CSS } from "../../helpers/loader.js";

export default async function(render) {

    const $page = createElement(`
        <div class="component_submenu">
            <style>${css}</style>
            <div class="action left">
                <button>New File</button>
                <button>New Folder</button>
            </div>
            <div class="action right">
                <button>
                    <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8cGF0aCBzdHlsZT0iZmlsbDojNjI2NDY5O2ZpbGwtb3BhY2l0eToxIiBkPSJNNTA1IDQ0Mi43TDQwNS4zIDM0M2MtNC41LTQuNS0xMC42LTctMTctN0gzNzJjMjcuNi0zNS4zIDQ0LTc5LjcgNDQtMTI4QzQxNiA5My4xIDMyMi45IDAgMjA4IDBTMCA5My4xIDAgMjA4czkzLjEgMjA4IDIwOCAyMDhjNDguMyAwIDkyLjctMTYuNCAxMjgtNDR2MTYuM2MwIDYuNCAyLjUgMTIuNSA3IDE3bDk5LjcgOTkuN2M5LjQgOS40IDI0LjYgOS40IDMzLjkgMGwyOC4zLTI4LjNjOS40LTkuNCA5LjQtMjQuNi4xLTM0ek0yMDggMzM2Yy03MC43IDAtMTI4LTU3LjItMTI4LTEyOCAwLTcwLjcgNTcuMi0xMjggMTI4LTEyOCA3MC43IDAgMTI4IDU3LjIgMTI4IDEyOCAwIDcwLjctNTcuMiAxMjgtMTI4IDEyOHoiIC8+Cjwvc3ZnPgo=" alt="search_dark">
                </button>
                <button>
                    <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8cGF0aCBzdHlsZT0iZmlsbDojNjI2NDY5O2ZpbGwtb3BhY2l0eToxIiBkPSJtIDEzMy4zMzMsNTYgdiA2NCBjIDAsMTMuMjU1IC0xMC43NDUsMjQgLTI0LDI0IEggMjQgQyAxMC43NDUsMTQ0IDAsMTMzLjI1NSAwLDEyMCBWIDU2IEMgMCw0Mi43NDUgMTAuNzQ1LDMyIDI0LDMyIGggODUuMzMzIGMgMTMuMjU1LDAgMjQsMTAuNzQ1IDI0LDI0IHogbSAzNzkuMzM0LDIzMiB2IC02NCBjIDAsLTEzLjI1NSAtMTAuNzQ1LC0yNCAtMjQsLTI0IEggMjEzLjMzMyBjIC0xMy4yNTUsMCAtMjQsMTAuNzQ1IC0yNCwyNCB2IDY0IGMgMCwxMy4yNTUgMTAuNzQ1LDI0IDI0LDI0IGggMjc1LjMzMyBjIDEzLjI1NiwwIDI0LjAwMSwtMTAuNzQ1IDI0LjAwMSwtMjQgeiBtIDAsLTE2OCBWIDU2IGMgMCwtMTMuMjU1IC0xMC43NDUsLTI0IC0yNCwtMjQgSCAyMTMuMzMzIGMgLTEzLjI1NSwwIC0yNCwxMC43NDUgLTI0LDI0IHYgNjQgYyAwLDEzLjI1NSAxMC43NDUsMjQgMjQsMjQgaCAyNzUuMzMzIGMgMTMuMjU2LDAgMjQuMDAxLC0xMC43NDUgMjQuMDAxLC0yNCB6IE0gMTA5LjMzMywyMDAgSCAyNCBDIDEwLjc0NSwyMDAgMCwyMTAuNzQ1IDAsMjI0IHYgNjQgYyAwLDEzLjI1NSAxMC43NDUsMjQgMjQsMjQgaCA4NS4zMzMgYyAxMy4yNTUsMCAyNCwtMTAuNzQ1IDI0LC0yNCB2IC02NCBjIDAsLTEzLjI1NSAtMTAuNzQ1LC0yNCAtMjQsLTI0IHogTSAwLDM5MiB2IDY0IGMgMCwxMy4yNTUgMTAuNzQ1LDI0IDI0LDI0IGggODUuMzMzIGMgMTMuMjU1LDAgMjQsLTEwLjc0NSAyNCwtMjQgdiAtNjQgYyAwLC0xMy4yNTUgLTEwLjc0NSwtMjQgLTI0LC0yNCBIIDI0IEMgMTAuNzQ1LDM2OCAwLDM3OC43NDUgMCwzOTIgWiBtIDE4OS4zMzMsMCB2IDY0IGMgMCwxMy4yNTUgMTAuNzQ1LDI0IDI0LDI0IGggMjc1LjMzMyBjIDEzLjI1NSwwIDI0LC0xMC43NDUgMjQsLTI0IHYgLTY0IGMgMCwtMTMuMjU1IC0xMC43NDUsLTI0IC0yNCwtMjQgSCAyMTMuMzMzIGMgLTEzLjI1NSwwIC0yNCwxMC43NDUgLTI0LDI0IHoiIC8+Cjwvc3ZnPgo=" alt="list">
                </button>
                <button>
                    <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgNTEyIj4KICA8cGF0aCBzdHlsZT0iZmlsbDojNjI2NDY5O2ZpbGwtb3BhY2l0eToxIiBkPSJNNDEgMjg4aDIzOGMyMS40IDAgMzIuMSAyNS45IDE3IDQxTDE3NyA0NDhjLTkuNCA5LjQtMjQuNiA5LjQtMzMuOSAwTDI0IDMyOWMtMTUuMS0xNS4xLTQuNC00MSAxNy00MXptMjU1LTEwNUwxNzcgNjRjLTkuNC05LjQtMjQuNi05LjQtMzMuOSAwTDI0IDE4M2MtMTUuMSAxNS4xLTQuNCA0MSAxNyA0MWgyMzhjMjEuNCAwIDMyLjEtMjUuOSAxNy00MXoiIC8+Cjwvc3ZnPgo=" alt="sort">
                </button>
            </div>
        </div>
    `)
    render($page);
}

const css = `
.component_submenu {
    display: flex;
    justify-content: space-between;
    padding: 0 15px;
}
.component_submenu .action.left {
    margin-left: 2px;
    margin-right: 5px;
}
.component_submenu .action.right {
    float: right;
    margin-right: 10px;
}
.component_submenu .action.right button img {
    width: 16px;
    height: 16px;
}
.component_submenu .action.right button,
.component_submenu .action.left button {
    background: var(--bg-color);
    border: 2px solid rgba(100, 100, 100, 0.05);
    padding: 5px 10px;
}
`

export async function OldOne(render) {
    const $page = createElement(`
<div class="component_submenu">
    <style>${await CSS(import.meta.url, "ctrl_submenu.css")}</style>
        <div class="menubar no-select"><span class="button-new-file">New File</span><span class="button-new-folder">New Folder</span>
            <div class="component_dropdown view sort ">
                <div class="dropdown_button"><img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgNTEyIj4KICA8cGF0aCBzdHlsZT0iZmlsbDojNjI2NDY5O2ZpbGwtb3BhY2l0eToxIiBkPSJNNDEgMjg4aDIzOGMyMS40IDAgMzIuMSAyNS45IDE3IDQxTDE3NyA0NDhjLTkuNCA5LjQtMjQuNiA5LjQtMzMuOSAwTDI0IDMyOWMtMTUuMS0xNS4xLTQuNC00MSAxNy00MXptMjU1LTEwNUwxNzcgNjRjLTkuNC05LjQtMjQuNi05LjQtMzMuOSAwTDI0IDE4M2MtMTUuMSAxNS4xLTQuNCA0MSAxNyA0MWgyMzhjMjEuNCAwIDMyLjEtMjUuOSAxNy00MXoiIC8+Cjwvc3ZnPgo=" alt="sort"></div>
                <div class="dropdown_container">
                    <ul>
                        <li>
                            <div>Sort By Type<span><span style="float: right;"><img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8cGF0aCBzdHlsZT0iZmlsbDojOTA5MDkwO2ZpbGwtb3BhY2l0eToxIiBkPSJNMTczLjg5OCA0MzkuNDA0bC0xNjYuNC0xNjYuNGMtOS45OTctOS45OTctOS45OTctMjYuMjA2IDAtMzYuMjA0bDM2LjIwMy0zNi4yMDRjOS45OTctOS45OTggMjYuMjA3LTkuOTk4IDM2LjIwNCAwTDE5MiAzMTIuNjkgNDMyLjA5NSA3Mi41OTZjOS45OTctOS45OTcgMjYuMjA3LTkuOTk3IDM2LjIwNCAwbDM2LjIwMyAzNi4yMDRjOS45OTcgOS45OTcgOS45OTcgMjYuMjA2IDAgMzYuMjA0bC0yOTQuNCAyOTQuNDAxYy05Ljk5OCA5Ljk5Ny0yNi4yMDcgOS45OTctMzYuMjA0LS4wMDF6IiAvPgo8L3N2Zz4K" alt="check"></span></span>
                            </div>
                        </li>
                        <li>
                            <div>Sort By Date</div>
                        </li>
                        <li>
                            <div>Sort By Name</div>
                        </li>
                    </ul>
                </div>
            </div>
            <div class="view list-grid"><img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8cGF0aCBzdHlsZT0iZmlsbDojNjI2NDY5O2ZpbGwtb3BhY2l0eToxIiBkPSJtIDEzMy4zMzMsNTYgdiA2NCBjIDAsMTMuMjU1IC0xMC43NDUsMjQgLTI0LDI0IEggMjQgQyAxMC43NDUsMTQ0IDAsMTMzLjI1NSAwLDEyMCBWIDU2IEMgMCw0Mi43NDUgMTAuNzQ1LDMyIDI0LDMyIGggODUuMzMzIGMgMTMuMjU1LDAgMjQsMTAuNzQ1IDI0LDI0IHogbSAzNzkuMzM0LDIzMiB2IC02NCBjIDAsLTEzLjI1NSAtMTAuNzQ1LC0yNCAtMjQsLTI0IEggMjEzLjMzMyBjIC0xMy4yNTUsMCAtMjQsMTAuNzQ1IC0yNCwyNCB2IDY0IGMgMCwxMy4yNTUgMTAuNzQ1LDI0IDI0LDI0IGggMjc1LjMzMyBjIDEzLjI1NiwwIDI0LjAwMSwtMTAuNzQ1IDI0LjAwMSwtMjQgeiBtIDAsLTE2OCBWIDU2IGMgMCwtMTMuMjU1IC0xMC43NDUsLTI0IC0yNCwtMjQgSCAyMTMuMzMzIGMgLTEzLjI1NSwwIC0yNCwxMC43NDUgLTI0LDI0IHYgNjQgYyAwLDEzLjI1NSAxMC43NDUsMjQgMjQsMjQgaCAyNzUuMzMzIGMgMTMuMjU2LDAgMjQuMDAxLC0xMC43NDUgMjQuMDAxLC0yNCB6IE0gMTA5LjMzMywyMDAgSCAyNCBDIDEwLjc0NSwyMDAgMCwyMTAuNzQ1IDAsMjI0IHYgNjQgYyAwLDEzLjI1NSAxMC43NDUsMjQgMjQsMjQgaCA4NS4zMzMgYyAxMy4yNTUsMCAyNCwtMTAuNzQ1IDI0LC0yNCB2IC02NCBjIDAsLTEzLjI1NSAtMTAuNzQ1LC0yNCAtMjQsLTI0IHogTSAwLDM5MiB2IDY0IGMgMCwxMy4yNTUgMTAuNzQ1LDI0IDI0LDI0IGggODUuMzMzIGMgMTMuMjU1LDAgMjQsLTEwLjc0NSAyNCwtMjQgdiAtNjQgYyAwLC0xMy4yNTUgLTEwLjc0NSwtMjQgLTI0LC0yNCBIIDI0IEMgMTAuNzQ1LDM2OCAwLDM3OC43NDUgMCwzOTIgWiBtIDE4OS4zMzMsMCB2IDY0IGMgMCwxMy4yNTUgMTAuNzQ1LDI0IDI0LDI0IGggMjc1LjMzMyBjIDEzLjI1NSwwIDI0LC0xMC43NDUgMjQsLTI0IHYgLTY0IGMgMCwtMTMuMjU1IC0xMC43NDUsLTI0IC0yNCwtMjQgSCAyMTMuMzMzIGMgLTEzLjI1NSwwIC0yNCwxMC43NDUgLTI0LDI0IHoiIC8+Cjwvc3ZnPgo=" alt="list"></div>
            <div class="view">
                <form><label class="view search"><div><img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8cGF0aCBzdHlsZT0iZmlsbDojNjI2NDY5O2ZpbGwtb3BhY2l0eToxIiBkPSJNNTA1IDQ0Mi43TDQwNS4zIDM0M2MtNC41LTQuNS0xMC42LTctMTctN0gzNzJjMjcuNi0zNS4zIDQ0LTc5LjcgNDQtMTI4QzQxNiA5My4xIDMyMi45IDAgMjA4IDBTMCA5My4xIDAgMjA4czkzLjEgMjA4IDIwOCAyMDhjNDguMyAwIDkyLjctMTYuNCAxMjgtNDR2MTYuM2MwIDYuNCAyLjUgMTIuNSA3IDE3bDk5LjcgOTkuN2M5LjQgOS40IDI0LjYgOS40IDMzLjkgMGwyOC4zLTI4LjNjOS40LTkuNCA5LjQtMjQuNi4xLTM0ek0yMDggMzM2Yy03MC43IDAtMTI4LTU3LjItMTI4LTEyOCAwLTcwLjcgNTcuMi0xMjggMTI4LTEyOCA3MC43IDAgMTI4IDU3LjIgMTI4IDEyOCAwIDcwLjctNTcuMiAxMjgtMTI4IDEyOHoiIC8+Cjwvc3ZnPgo=" alt="search_dark"></div></label><span><input type="text" id="search" placeholder="search" name="search" autocomplete="off" value="" style="width: 0px;"><label for="search" class="hidden">search</label></span></form>
            </div>
        </div>
    </div>
</div>
`);

    render($page);
}
