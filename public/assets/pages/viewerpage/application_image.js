import { createElement, createRender } from "../../lib/skeleton/index.js";
import rxjs, { effect, onLoad } from "../../lib/rx.js";
import { animate } from "../../lib/animate.js";
import { loadCSS } from "../../helpers/loader.js";
import { qs } from "../../lib/dom.js";
import { createLoader } from "../../components/loader.js";
import ctrlError from "../ctrl_error.js";

import { transition, getFilename, getDownloadUrl } from "./common.js";

import componentMetadata from "./application_image_metadata.js";
import componentPager, { init as initPager } from "./component_pager.js";

import { renderMenubar, buttonDownload, buttonFullscreen } from "./component_menubar.js";

export default function(render) {
    const $page = createElement(`
        <div class="component_imageviewer">
            <component-menubar></component-menubar>
            <div class="component_image_container">
                <div class="images_wrapper">
                    <img class="photo idle hidden" draggable="true" src="${getDownloadUrl()}">
                </div>
                <div class="images_aside scroll-y"></div>
                <div class="component_pager hidden"></div>
            </div>
        </div>
    `);
    render($page);
    renderMenubar(
        qs($page, "component-menubar"),
        buttonDownload(getFilename(), getDownloadUrl()),
        buttonFullscreen(qs($page, ".component_image_container")),
    );
    transition(qs($page, ".component_image_container"));

    const removeLoader = createLoader(qs($page, ".images_wrapper"));
    const $photo = qs($page, "img.photo");
    effect(onLoad($photo).pipe(
        removeLoader,
        rxjs.tap(($node) => {
            $node.classList.remove("hidden");
            animate($node, {
                time: 300,
                easing: "cubic-bezier(.51,.92,.24,1.15)",
                keyframes: [
                    { opacity: 0, transform: "scale(.97)" },
                    { opacity: 1 },
                    { opacity: 1, transform: "scale(1)" },
                ],
            });
        }),
        rxjs.catchError((err) => {
            if (err.target instanceof window.HTMLElement && err.type === "error") {
                return rxjs.of($photo).pipe(
                    removeLoader,
                    rxjs.tap(($img) => {
                        $img.setAttribute("src", "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgaGVpZ2h0PSIxNiIKICAgd2lkdGg9IjE2IgogICB2ZXJzaW9uPSIxLjEiCiAgIGlkPSJzdmcyNzU2IgogICBzb2RpcG9kaTpkb2NuYW1lPSJkb3dubG9hZC5zdmciCiAgIGlua3NjYXBlOnZlcnNpb249IjEuMi4yIChiMGE4NDg2NTQxLCAyMDIyLTEyLTAxKSIKICAgeG1sbnM6aW5rc2NhcGU9Imh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGUiCiAgIHhtbG5zOnNvZGlwb2RpPSJodHRwOi8vc29kaXBvZGkuc291cmNlZm9yZ2UubmV0L0RURC9zb2RpcG9kaS0wLmR0ZCIKICAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogICB4bWxuczpzdmc9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcwogICAgIGlkPSJkZWZzMjc2MCIgLz4KICA8c29kaXBvZGk6bmFtZWR2aWV3CiAgICAgaWQ9Im5hbWVkdmlldzI3NTgiCiAgICAgcGFnZWNvbG9yPSIjZmZmZmZmIgogICAgIGJvcmRlcmNvbG9yPSIjMDAwMDAwIgogICAgIGJvcmRlcm9wYWNpdHk9IjAuMjUiCiAgICAgaW5rc2NhcGU6c2hvd3BhZ2VzaGFkb3c9IjIiCiAgICAgaW5rc2NhcGU6cGFnZW9wYWNpdHk9IjAuMCIKICAgICBpbmtzY2FwZTpwYWdlY2hlY2tlcmJvYXJkPSIwIgogICAgIGlua3NjYXBlOmRlc2tjb2xvcj0iI2QxZDFkMSIKICAgICBzaG93Z3JpZD0iZmFsc2UiCiAgICAgaW5rc2NhcGU6em9vbT0iNDEuNzE5MyIKICAgICBpbmtzY2FwZTpjeD0iMTEuMzI1NjkzIgogICAgIGlua3NjYXBlOmN5PSI4LjU1NzE5MDUiCiAgICAgaW5rc2NhcGU6d2luZG93LXdpZHRoPSIxOTA0IgogICAgIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9IjExNTciCiAgICAgaW5rc2NhcGU6d2luZG93LXg9IjciCiAgICAgaW5rc2NhcGU6d2luZG93LXk9IjM0IgogICAgIGlua3NjYXBlOndpbmRvdy1tYXhpbWl6ZWQ9IjEiCiAgICAgaW5rc2NhcGU6Y3VycmVudC1sYXllcj0ic3ZnMjc1NiIgLz4KICA8cGF0aAogICAgIHN0eWxlPSJjb2xvcjojMDAwMDAwO3RleHQtaW5kZW50OjA7dGV4dC10cmFuc2Zvcm06bm9uZTtmaWxsOiMzYjQwNDU7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlLXdpZHRoOjAuOTg0ODEwNDEiCiAgICAgZD0ibSAyLDEzLjA4MjQxMiAwLjAxOTQ2MiwxLjQ5MjM0NyBjIDVlLTYsMC4yMjIxNDUgMC4yMDU1OTAyLDAuNDI0MjYyIDAuNDMxMTUwMiwwLjQyNDI3MiBMIDEzLjU4OTYxMiwxNSBDIDEzLjgxNTE3MywxNC45OTk5OTUgMTMuOTk5OTksMTQuNzk3ODc0IDE0LDE0LjU3NTcyOSB2IC0xLjQ5MzMxNyBjIC00LjE3MTg2OTIsMC42NjIwMjMgLTcuNjUxNjkyOCwwLjM5ODY5NiAtMTIsMCB6IgogICAgIGlkPSJwYXRoMjc1MCIgLz4KICA8cGF0aAogICAgIHN0eWxlPSJjb2xvcjojMDAwMDAwO3RleHQtaW5kZW50OjA7dGV4dC10cmFuc2Zvcm06bm9uZTtkaXNwbGF5OmlubGluZTtmaWxsOiNmOWY5ZmE7c3Ryb2tlLXdpZHRoOjAuOTg0MDgxMjc7ZmlsbC1vcGFjaXR5OjEiCiAgICAgZD0iTSAyLjM1MDEsMS4wMDEzMzEyIEMgMi4xNTI1OSwxLjAzODMyNDcgMS45OTY1OSwxLjIyNzI3MjMgMi4wMDAwOSwxLjQyNDkzNTYgViAxNC4xMzM0NTcgYyA1ZS02LDAuMjIxODE2IDAuMjA1MjMsMC40MjM2MzQgMC40MzA3OSwwLjQyMzY0NCBsIDExLjEzOSwtMS4wMWUtNCBjIDAuMjI1NTYsLTZlLTYgMC40MzAxMSwtMC4yMDA3NTggMC40MzAxMiwtMC40MjI1NzQgbCA2LjdlLTQsLTkuODIyNjQyNiBjIC0yLjQ4NDA0NiwtMS4zNTUwMDYgLTIuNDM1MjM0LC0yLjAzMTIyNTQgLTMuNTAwMSwtMy4zMDk3MDcgLTAuMDQzLC0wLjAxNTg4MiAwLjA0NiwwLjAwMTc0IDAsMCBMIDIuNDMwNjcsMS4wMDExMDggQyAyLjQwMzgzLDAuOTk4NTkgMi4zNzY3NCwwLjk5ODU5IDIuMzQ5OSwxLjAwMTEwOCBaIgogICAgIGlkPSJwYXRoMjc1MiIgLz4KICA8cGF0aAogICAgIHN0eWxlPSJkaXNwbGF5OmlubGluZTtmaWxsOiMzYjQwNDU7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOiM5ZTc1NzU7c3Ryb2tlLXdpZHRoOjA7c3Ryb2tlLWxpbmVjYXA6YnV0dDtzdHJva2UtbGluZWpvaW46bWl0ZXI7c3Ryb2tlLW1pdGVybGltaXQ6NDtzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLW9wYWNpdHk6MSIKICAgICBkPSJtIDEwLjUwMDU3LDEuMDAyMDc2NCBjIDAsMy4yNzY4MDI4IC0wLjAwNTIsMy4xNzM5MTYxIDAuMzYyOTIxLDMuMjY5ODIwMiAwLjI4MDEwOSwwLjA3Mjk4NCAzLjEzNzE4LDAuMDM5ODg3IDMuMTM3MTgsMC4wMzk4ODcgLTEuMTIwMDY3LC0xLjA1NTY2OTIgLTIuMzMzNCwtMi4yMDY0NzEzIC0zLjUwMDEsLTMuMzA5NzA3NCB6IgogICAgIGlkPSJwYXRoMjc1NCIgLz4KPC9zdmc+Cg==");
                        $img.classList.remove("hidden");
                        $img.classList.add("error");
                        $img.parentElement.appendChild(createElement(`
                            <div class="error no-select">
                                This file format is not supported
                            </div>
                        `));
                    }),
                    rxjs.catchError(ctrlError()),
                );
            }
            return ctrlError()(err);
        }),
    ));

    componentMetadata(createRender(qs($page, ".images_aside")));
    componentPager(createRender(qs($page, ".component_pager")));
}

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "./application_image.css"),
        initPager(), // initMetadata(),
    ]);
}
