import { createElement } from "../lib/skeleton/index.js";
import { qs, safe } from "../lib/dom.js";
import rxjs, { effect, applyMutation } from "../../lib/rx.js";
import { basename } from "../lib/path.js";
import { getSession } from "../model/session.js";
import { onLogout } from "../pages/ctrl_logout.js";
import t from "../locales/index.js";

const refresh$ = new rxjs.Subject();
const currentShare = () => new window.URL(location.href).searchParams.get("share") || "";

let backendID = "";
const initBackendID = async () => {
    if (backendID) return;
    backendID = await getSession().toPromise().then(({ backendID }) => backendID);
    onLogout(() => backendID = "");
};

export default async function(render, { path }) {
    const $page = createElement(`
        <div id="sidebar_favorite">
            <h3 class="no-select">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span>${t("Favourites")}</span>
            </h3>
            <ul data-bind="content"></ul>
            <style>${CSS}</style>
        </div>
    `);
    render($page);

    effect(rxjs.merge(refresh$, rxjs.of(null)).pipe(
        rxjs.mergeMap(() => initBackendID()),
        rxjs.mergeMap(() => listFavourites(path)),
        rxjs.map((favourites) => {
            if (favourites.length === 0) return createElement(`<div class="placeholder center no-select">∅</div>`);
            const $list = document.createDocumentFragment();
            for (let i=0; i<favourites.length; i++) {
                const path = favourites[i].path;
                const type = path.endsWith("/") ? "directory" : "file"
                const href = (type === "directory" ? "/files" : "/view") + path;
                const ICON = {
                    "FILE": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIHN0eWxlPSJzdHJva2U6IzU3NTk1YTtmaWxsOiAjNTc1OTVhOyIgZD0iTTEzIDJINmEyIDIgMCAwIDAtMiAydjE2YTIgMiAwIDAgMCAyIDJoMTJhMiAyIDAgMCAwIDItMlY5eiIvPjwvc3ZnPgo=",
                    "FOLDER": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgYXJpYS1oaWRkZW49InRydWUiCiAgIGZvY3VzYWJsZT0iZmFsc2UiCiAgIGNsYXNzPSJvY3RpY29uIG9jdGljb24tZmlsZS1kaXJlY3RvcnktZmlsbCIKICAgdmlld0JveD0iMCAwIDE2IDE2IgogICB3aWR0aD0iMTYiCiAgIGhlaWdodD0iMTYiCiAgIGZpbGw9ImN1cnJlbnRDb2xvciIKICAgc3R5bGU9ImRpc3BsYXk6IGlubGluZS1ibG9jazsgdXNlci1zZWxlY3Q6IG5vbmU7IHZlcnRpY2FsLWFsaWduOiB0ZXh0LWJvdHRvbTsgb3ZlcmZsb3c6IHZpc2libGU7IgogICB2ZXJzaW9uPSIxLjEiCiAgIGlkPSJzdmcxNTgiCiAgIHNvZGlwb2RpOmRvY25hbWU9ImdpdGh1YmZvbGRlci5zdmciCiAgIGlua3NjYXBlOnZlcnNpb249IjEuMi4yIChiMGE4NDg2NTQxLCAyMDIyLTEyLTAxKSIKICAgeG1sbnM6aW5rc2NhcGU9Imh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGUiCiAgIHhtbG5zOnNvZGlwb2RpPSJodHRwOi8vc29kaXBvZGkuc291cmNlZm9yZ2UubmV0L0RURC9zb2RpcG9kaS0wLmR0ZCIKICAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogICB4bWxuczpzdmc9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcwogICAgIGlkPSJkZWZzMTYyIiAvPgogIDxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBpZD0ibmFtZWR2aWV3MTYwIgogICAgIHBhZ2Vjb2xvcj0iI2ZmZmZmZiIKICAgICBib3JkZXJjb2xvcj0iIzAwMDAwMCIKICAgICBib3JkZXJvcGFjaXR5PSIwLjI1IgogICAgIGlua3NjYXBlOnNob3dwYWdlc2hhZG93PSIyIgogICAgIGlua3NjYXBlOnBhZ2VvcGFjaXR5PSIwLjAiCiAgICAgaW5rc2NhcGU6cGFnZWNoZWNrZXJib2FyZD0iMCIKICAgICBpbmtzY2FwZTpkZXNrY29sb3I9IiNkMWQxZDEiCiAgICAgc2hvd2dyaWQ9ImZhbHNlIgogICAgIGlua3NjYXBlOnpvb209IjcxLjYyNSIKICAgICBpbmtzY2FwZTpjeD0iNy44MTE1MTgzIgogICAgIGlua3NjYXBlOmN5PSI4IgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMjAzNiIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSIxMzk3IgogICAgIGlua3NjYXBlOndpbmRvdy14PSI3IgogICAgIGlua3NjYXBlOndpbmRvdy15PSIzNCIKICAgICBpbmtzY2FwZTp3aW5kb3ctbWF4aW1pemVkPSIxIgogICAgIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9InN2ZzE1OCIgLz4KICA8cGF0aAogICAgIGQ9Ik0xLjc1IDFBMS43NSAxLjc1IDAgMCAwIDAgMi43NXYxMC41QzAgMTQuMjE2Ljc4NCAxNSAxLjc1IDE1aDEyLjVBMS43NSAxLjc1IDAgMCAwIDE2IDEzLjI1di04LjVBMS43NSAxLjc1IDAgMCAwIDE0LjI1IDNINy41YS4yNS4yNSAwIDAgMS0uMi0uMWwtLjktMS4yQzYuMDcgMS4yNiA1LjU1IDEgNSAxSDEuNzVaIgogICAgIGlkPSJwYXRoMTU2IgogICAgIHN0eWxlPSJmaWxsOiM1NzU5NWE7ZmlsbC1vcGFjaXR5OjEiIC8+Cjwvc3ZnPgo=",
                };
                const withRemove = ($el) => {
                    qs($el, "svg").onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        $el.closest("li").remove();
                        removeFavourite(path);
                    };
                    return $el;
                };
                $list.appendChild(withRemove(createElement(`
                    <li data-path="${safe(path)}" title="${safe(path)}" class="no-select">
                        <a data-link href="${safe(href)}" draggable="false" aria-selected="false">
                            <div class="flex ellipsis">
                                <img class="component_icon" alt="${type}" src="${type === "directory" ? ICON.FOLDER : ICON.FILE}">
                                <span>${safe(basename(path.replace(new RegExp("/$"), "")))}</span>
                            </div>
                            <svg class="component_icon" draggable="false" alt="close" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </a>
                    </li>
                `)));
            }
            return $list;
        }),
        applyMutation(qs($page, `[data-bind="content"]`), "replaceChildren"),
    ));
}

export async function toggleFavourite(path) {
    return db().then((db) => new Promise((resolve, reject) => {
        const tx = db.transaction("favourites", "readonly");
        const store = tx.objectStore("favourites");
        const req = store.get([backendID, currentShare(), path]);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    })).then((existing) => existing ? removeFavourite(path) : addFavourite(path)).then(() => refresh$.next(null));
}

function listFavourites(path) {
    return db().then((db) => new Promise((resolve, reject) => {
        const tx = db.transaction("favourites", "readonly");
        const store = tx.objectStore("favourites");
        const req = store.index("parent").getAll(IDBKeyRange.bound(
            [backendID, currentShare(), path],
            [backendID, currentShare(), path + "\uffff"],
        ));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }));
}

function addFavourite(path) {
    return db().then((db) => new Promise((resolve, reject) => {
        const tx = db.transaction("favourites", "readwrite");
        const store = tx.objectStore("favourites");
        store.put({ backend: backendID, path, share: currentShare(), parent: path.replace(new RegExp("[^/]*\/?$"), "") });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    }));
}

function removeFavourite(path) {
    return db().then((db) => new Promise((resolve, reject) => {
        const tx = db.transaction("favourites", "readwrite");
        const store = tx.objectStore("favourites");
        store.delete([backendID, currentShare(), path]);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    }));
}

const db = () => {
    let _db = null;
    return new Promise((resolve, reject) => {
        if (_db) return Promise.resolve(_db);
        const req = indexedDB.open("favourites", 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            const store = db.createObjectStore("favourites", { keyPath: ["backend", "share", "path"] });
            store.createIndex("parent", ["backend", "share", "parent"]);
        };
        req.onsuccess = () => { _db = req.result; resolve(_db); };
        req.onerror = () => reject(req.error);
    });
};

const CSS = `
#sidebar_favorite svg {
    position: relative;
    bottom: 3px;
}
#sidebar_favorite ul li a {
    justify-content: space-between;
}
#sidebar_favorite ul li a > div {
    margin-left: -5px;
}
#sidebar_favorite ul li a svg {
    display: none;
    background: rgba(255, 255, 255, 0.6);
    align-self: center;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    padding: 4px;
    position: initial;
}
#sidebar_favorite ul li a:hover svg {
    display: block;
}
`;
