import { createFragment } from "../../lib/skeleton/index.js";

export function menubarDownload() {
    const $fragment = createFragment(`
        <span class="download-button">
            <span>
                <a href="/api/files/cat?path=%2FDocuments%2Fgetting_started.pdf" download="getting_started.pdf">
                    <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzODQgNTEyIj4KICA8cGF0aCBmaWxsPSIjZjJmMmYyIiBkPSJNIDM2MCw0NjAgSCAyNCBDIDEwLjcsNDYwIDAsNDUzLjMgMCw0NDAgdiAtMTIgYyAwLC0xMy4zIDEwLjcsLTIwIDI0LC0yMCBoIDMzNiBjIDEzLjMsMCAyNCw2LjcgMjQsMjAgdiAxMiBjIDAsMTMuMyAtMTAuNywyMCAtMjQsMjAgeiIgLz4KICA8cGF0aCBmaWxsPSIjZjJmMmYyIiBkPSJNIDIyNi41NTM5LDIzNC44ODQyOCBWIDUyLjk0MzI4MyBjIDAsLTYuNjI3IC01LjM3MywtMTIgLTEyLC0xMiBoIC00NCBjIC02LjYyNywwIC0xMiw1LjM3MyAtMTIsMTIgViAyMzQuODg0MjggaCAtNTIuMDU5IGMgLTIxLjM4MiwwIC0zMi4wOSwyNS44NTEgLTE2Ljk3MSw0MC45NzEgbCA4Ni4wNTksODYuMDU5IGMgOS4zNzMsOS4zNzMgMjQuNTY5LDkuMzczIDMzLjk0MSwwIGwgODYuMDU5LC04Ni4wNTkgYyAxNS4xMTksLTE1LjExOSA0LjQxMSwtNDAuOTcxIC0xNi45NzEsLTQwLjk3MSB6IiAvPgo8L3N2Zz4K" alt="download_white">
                </a>
            </span>
        </span>
    `);
    $fragment.querySelector(".download-button").onclick = () => {
        console.log("CLICK");
    };
    return $fragment;
}

export function menubarChromecast() {
    return createFragment(`
        <span class="specific">
            <span id="chromecast-target"></span>
        </span>
    `);
}

export function buildMenubar(...$fragments) {
    const $buttons = document.createDocumentFragment();
    for (let i=0; i<$fragments.length; i++) {
        $buttons.appendChild($fragments[i]);
    }
    return $buttons;
}
