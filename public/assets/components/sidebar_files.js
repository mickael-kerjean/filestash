import rxjs, { effect } from "../lib/rx.js";
import { createElement, createRender } from "../lib/skeleton/index.js";
import { toHref } from "../lib/skeleton/router.js";
import { qs, qsa, safe } from "../lib/dom.js";
import { forwardURLParams } from "../lib/path.js";
import cache from "../pages/filespage/cache.js";
import { extractPath, isDir, isNativeFileUpload } from "../pages/filespage/helper.js";
import { mv as mvVL, withVirtualLayer } from "../pages/filespage/model_virtual_layer.js";
import { hooks, mv as mv$ } from "../pages/filespage/model_files.js";

export default async function ctrlNavigationPane(render, { $sidebar, path }) {
    // feature: init dom
    const $fs = document.createDocumentFragment();
    const dirname = path.replace(new RegExp("[^\/]*$"), "");
    const chunks = dirname.split("/");
    for (let i=1; i<chunks.length; i++) {
        const cpath = chunks.slice(0, i).join("/") + "/";
        const $ul = await _createListOfFiles(cpath, {
            basename: chunks[i],
            dirname,
        });
        if (cpath === "/") $fs.appendChild($ul);
        else qs($fs, `[data-path="${CSS.escape(cpath)}"] ul`).appendChild($ul);
    }
    render($fs);

    // feature: listen for updates
    effect(new rxjs.Observable((subscriber) => {
        const cleaners = [
            hooks.ls.listen(({ path }) => subscriber.next(path)),
            hooks.mutation.listen(async({ op, path }) => {
                if (["mv", "mkdir", "rm"].indexOf(op) === -1) return;
                subscriber.next(path);
            }),
        ];
        return () => cleaners.map((fn) => fn());
    }).pipe(
        rxjs.tap(async(path) => {
            const display = path === "/" ? render : createRender(qs($sidebar, `[data-path="${CSS.escape(path)}"] ul`));
            display(await _createListOfFiles(path, {}));
        }),
    ));

    // feature: highlight current selection
    try {
        const $active = qs($sidebar, `[data-path="${dirname}"] a`);
        const checkVisible = ($el) => {
            const rect = $el.getBoundingClientRect();
            return rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth);
        };
        $active.setAttribute("aria-selected", "true");
        const tags = new URLSearchParams(location.search).getAll("tag").length;
        if (checkVisible($active) === false && tags === 0) {
            $active.offsetTop < window.innerHeight
                ? $sidebar.firstChild.scrollTo({ top: 0, behavior: "smooth" })
                : $active.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    } catch (err) {}

    // feature: quick search
    effect(rxjs.fromEvent(qs($sidebar, "h3 input"), "keydown").pipe(
        rxjs.debounceTime(200),
        rxjs.tap((e) => {
            const inputValue = e.target.value.toLowerCase();
            qsa($sidebar, "[data-bind=\"your-files\"] li a").forEach(($li) => {
                if (inputValue === "") {
                    $li.classList.remove("hidden");
                    $sidebar.classList.remove("search");
                    return;
                }
                $sidebar.classList.add("search");
                qs($li, "div").textContent.toLowerCase().indexOf(inputValue) === -1
                    ? $li.classList.add("hidden")
                    : $li.classList.remove("hidden");
            });
        }),
        rxjs.finalize(() => $sidebar.classList.remove("search")),
    ));
}

const mv = (from, to) => withVirtualLayer(
    mv$(from, to),
    mvVL(from, to),
);

async function _createListOfFiles(path, { basename = null, dirname = null }) {
    const r = await cache().get(path);
    const whats = r === null
        ? (basename ? [basename] : [])
        : r.files
            .filter(({ type, name }) => type === "directory" && name[0] !== ".")
            .map(({ name }) => name)
            .sort();

    const MAX_DISPLAY = 100;
    const $lis = document.createDocumentFragment();
    const $fragment = document.createDocumentFragment();
    const $ul = document.createElement("ul");
    for (let i=0; i<whats.length; i++) {
        const currpath = path + whats[i] + "/";
        const $li = createElement(`
            <li data-path="${safe(currpath)}" title="${safe(currpath)}" class="no-select">
                <a data-link href="${safe(forwardURLParams(toHref("/files" + encodeURIComponent(currpath).replaceAll("%2F", "/")), ["share", "canary"]))}" draggable="false" aria-selected="false">
                    <img class="component_icon" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgYXJpYS1oaWRkZW49InRydWUiCiAgIGZvY3VzYWJsZT0iZmFsc2UiCiAgIGNsYXNzPSJvY3RpY29uIG9jdGljb24tZmlsZS1kaXJlY3RvcnktZmlsbCIKICAgdmlld0JveD0iMCAwIDE2IDE2IgogICB3aWR0aD0iMTYiCiAgIGhlaWdodD0iMTYiCiAgIGZpbGw9ImN1cnJlbnRDb2xvciIKICAgc3R5bGU9ImRpc3BsYXk6IGlubGluZS1ibG9jazsgdXNlci1zZWxlY3Q6IG5vbmU7IHZlcnRpY2FsLWFsaWduOiB0ZXh0LWJvdHRvbTsgb3ZlcmZsb3c6IHZpc2libGU7IgogICB2ZXJzaW9uPSIxLjEiCiAgIGlkPSJzdmcxNTgiCiAgIHNvZGlwb2RpOmRvY25hbWU9ImdpdGh1YmZvbGRlci5zdmciCiAgIGlua3NjYXBlOnZlcnNpb249IjEuMi4yIChiMGE4NDg2NTQxLCAyMDIyLTEyLTAxKSIKICAgeG1sbnM6aW5rc2NhcGU9Imh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGUiCiAgIHhtbG5zOnNvZGlwb2RpPSJodHRwOi8vc29kaXBvZGkuc291cmNlZm9yZ2UubmV0L0RURC9zb2RpcG9kaS0wLmR0ZCIKICAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogICB4bWxuczpzdmc9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcwogICAgIGlkPSJkZWZzMTYyIiAvPgogIDxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBpZD0ibmFtZWR2aWV3MTYwIgogICAgIHBhZ2Vjb2xvcj0iI2ZmZmZmZiIKICAgICBib3JkZXJjb2xvcj0iIzAwMDAwMCIKICAgICBib3JkZXJvcGFjaXR5PSIwLjI1IgogICAgIGlua3NjYXBlOnNob3dwYWdlc2hhZG93PSIyIgogICAgIGlua3NjYXBlOnBhZ2VvcGFjaXR5PSIwLjAiCiAgICAgaW5rc2NhcGU6cGFnZWNoZWNrZXJib2FyZD0iMCIKICAgICBpbmtzY2FwZTpkZXNrY29sb3I9IiNkMWQxZDEiCiAgICAgc2hvd2dyaWQ9ImZhbHNlIgogICAgIGlua3NjYXBlOnpvb209IjcxLjYyNSIKICAgICBpbmtzY2FwZTpjeD0iNy44MTE1MTgzIgogICAgIGlua3NjYXBlOmN5PSI4IgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMjAzNiIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSIxMzk3IgogICAgIGlua3NjYXBlOndpbmRvdy14PSI3IgogICAgIGlua3NjYXBlOndpbmRvdy15PSIzNCIKICAgICBpbmtzY2FwZTp3aW5kb3ctbWF4aW1pemVkPSIxIgogICAgIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9InN2ZzE1OCIgLz4KICA8cGF0aAogICAgIGQ9Ik0xLjc1IDFBMS43NSAxLjc1IDAgMCAwIDAgMi43NXYxMC41QzAgMTQuMjE2Ljc4NCAxNSAxLjc1IDE1aDEyLjVBMS43NSAxLjc1IDAgMCAwIDE2IDEzLjI1di04LjVBMS43NSAxLjc1IDAgMCAwIDE0LjI1IDNINy41YS4yNS4yNSAwIDAgMS0uMi0uMWwtLjktMS4yQzYuMDcgMS4yNiA1LjU1IDEgNSAxSDEuNzVaIgogICAgIGlkPSJwYXRoMTU2IgogICAgIHN0eWxlPSJmaWxsOiM1NzU5NWE7ZmlsbC1vcGFjaXR5OjEiIC8+Cjwvc3ZnPgo=" alt="directory">
                    <div class="ellipsis">${safe(whats[i])}</div>
                </a>
                <ul></ul>
            </li>
        `);
        const $link = qs($li, "a");
        if ($link.getAttribute("href") === "/files" + dirname) {
            $link.removeAttribute("href", "");
            $link.removeAttribute("data-link");
        } else {
            $link.ondrop = async(e) => {
                $link.classList.remove("highlight");
                const from = e.dataTransfer.getData("path");
                let to = $link.parentElement.getAttribute("data-path");
                const [, fromName] = extractPath(from);
                to += fromName;
                if (isDir(from)) to += "/";
                if (from === to) return;
                await mv(from, to).toPromise();
            };
            $link.ondragover = (e) => {
                if (isNativeFileUpload(e)) return;
                e.preventDefault();
                $link.classList.add("highlight");
            };
            $link.ondragleave = () => {
                $link.classList.remove("highlight");
            };
        }

        if (i <= MAX_DISPLAY) $lis.appendChild($li);
        else $fragment.appendChild($li);
        if (i === MAX_DISPLAY) {
            const $more = createElement(`
                <li title="..." class="no-select pointer">
                    <a><div class="ellipsis">...</div></a>
                </li>
            `);
            $lis.appendChild($more);
            $more.onclick = () => {
                $ul.appendChild($fragment);
                $more.remove();
            };
        }
    }
    $ul.appendChild($lis);
    return $ul;
}
