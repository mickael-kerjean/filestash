import { createElement } from "../../lib/skeleton/index.js";
import { onDestroy } from "../../lib/skeleton/lifecycle.js";
import rxjs, { effect } from "../../lib/rx.js";
import WaveSurfer from "../../lib/vendor/wavesurfer.js";
import { loadCSS } from "../../helpers/loader.js";

import { getDownloadUrl } from "./common.js";

import "../../components/menubar.js";

export default function(render) {
    const $page = createElement(`
        <div class="component_formviewer">
            <component-menubar></component-menubar>
            <div id="waveform"></div>
        </div>
    `);
    render($page);

    const wavesurfer = WaveSurfer.create({
        container: "#waveform",
        interact: false,

        waveColor: "#323639",
        progressColor: "#808080",
        cursorColor: "#6f6f6f",
        cursorWidth: 3,
        height: 200,
        barWidth: 1,
    });
    wavesurfer.load(getDownloadUrl());
    onDestroy(() => wavesurfer.destroy());
}

export function init() {
    return loadCSS(import.meta.url, "./application_audio.css");
}
